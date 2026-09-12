import contextlib
import importlib
import io
import json
import sys
import tempfile
import unittest
from datetime import datetime,timedelta,timezone
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).parents[1]/'scripts'))
from lib.cron_quality import *
import schedule_approved_drafts as scheduler
import content_weekly_synthesis as weekly
import content_ideas_research as research
from lib.seo_tracking import cooling_targets,is_usable_target
import harvest_site_changes

class Fixes(unittest.TestCase):
    def test_error_capture_rejected(self):
        for rows in ([],[{'raw_text':'[synthesis failed]'}]):
            with self.assertRaises(ValueError): validate_captures(rows)
    def test_valid_capture(self):
        validate_captures([dict(raw_text='Source',link='https://example.org',rewrite='Rewrite',why_it_worked='Mechanism')])
    def test_empty_synthesis_rejected(self):
        with self.assertRaises(ValueError): validate_synthesis({})
    def test_existing_synthesis_preserved_on_failure(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'weekly.md';p.write_text('GOOD')
            with patch.object(weekly,'OUT_FILE',str(p)),patch.object(weekly,'load_week_notes',return_value=[{}]),patch.object(weekly,'build_synthesis_prompt',return_value='prompt'),patch.object(weekly,'call_hermes_oneshot',return_value={}):
                with contextlib.redirect_stdout(io.StringIO()): self.assertEqual(weekly.main(),1)
            self.assertEqual(p.read_text(),'GOOD')
    def test_approval_bound_to_content(self):
        d={'week':expected_week(),'posts':[{'text':'Original'}]}
        self.assertFalse(approval_valid(d))
        d['human_approval']={'approved':True,'approved_by':'Travis','evidence':'telegram:123','approved_at':datetime.now(timezone.utc).isoformat(),'draft_sha256':draft_digest(d)}
        self.assertTrue(approval_valid(d));d['posts'][0]['text']='Edited';self.assertFalse(approval_valid(d))
    def test_scheduler_never_calls_api_without_approval(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'week.json';p.write_text(json.dumps({'week':expected_week(),'posts':[{'approved':True}]}))
            with patch.object(scheduler,'env_or_file',return_value='fake'),patch.object(scheduler,'find_latest_draft',return_value=str(p)),patch.object(scheduler,'fetch_existing_scheduled') as fetch,patch.object(scheduler,'queue_x_post') as queue:
                with contextlib.redirect_stdout(io.StringIO()):self.assertEqual(scheduler.main(),1)
                fetch.assert_not_called();queue.assert_not_called()
    def test_source_event_timestamp(self):
        start=datetime(2026,9,10,tzinfo=timezone.utc);end=start+timedelta(days=1)
        self.assertEqual(len(event_window([{'ts':'2026-09-12T00:00:00Z','metrics':{'ts':'2026-09-10T12:00:00Z'}}],start,end)),1)
    def test_cooldown(self):
        now=datetime.now(timezone.utc)
        with patch('lib.seo_tracking.iter_events',return_value=[{'event_type':'site_change','site':'hf','target':'/test','review_after':(now+timedelta(days=14)).isoformat()}]):
            self.assertEqual(cooling_targets(now),{'/test'})

    def test_queue_item_target_is_a_bare_path(self):
        # Regression: the old greedy regex backtracked onto the closing backtick
        # and captured across newlines, yielding a markdown blob that matched no
        # queue item — so the cooldown was a silent no-op for every event.
        report=('**Queue item taken:** T1 CONSOLIDATE — `/find-a-hypnotherapist`  \n'
                'Query: **"hypnotherapists"** — 273 impr, best pos 11.3\n\n'
                '**What shipped:** strengthened `/location/atlanta` routing.\n')
        self.assertEqual(harvest_site_changes.QUEUE_ITEM_RE.search(report).group(1),'/find-a-hypnotherapist')

    def test_malformed_target_is_rejected_not_silently_cooled(self):
        now=datetime.now(timezone.utc)
        blob='  \nQuery: **"hypnotherapists"** — 273 impr, 0 clicks\n\n**Why:** top item'
        with patch('lib.seo_tracking.iter_events',return_value=[{'event_type':'site_change','site':'hf','target':blob,'review_after':(now+timedelta(days=14)).isoformat()}]):
            targets,rejects=cooling_targets(now,with_rejects=True)
        self.assertEqual(targets,set())   # never silently joins the cooling set
        self.assertEqual(rejects,1)       # and is surfaced instead of vanishing
        self.assertFalse(is_usable_target(blob))
        self.assertTrue(is_usable_target('/find-a-hypnotherapist'))
    def test_login_not_banned_substring(self):
        self.assertNotIn('banned substring: login',scheduler.validate_x_post('A login workflow'))
    def test_date_sunday_targets_monday(self):
        self.assertEqual(expected_week(datetime(2026,9,13)), '2026-09-14')

    def test_unknown_post_outcome_not_retried(self):
        with patch.object(scheduler,'schedule_post',side_effect=TimeoutError('unknown outcome')) as post:
            with self.assertRaises(TimeoutError): scheduler.schedule_post_with_retry('key','id','FB_UGS','date','text')
            self.assertEqual(post.call_count,1)
    def test_expired_cooldown(self):
        now=datetime.now(timezone.utc)
        with patch('lib.seo_tracking.iter_events',return_value=[{'event_type':'site_change','site':'hf','target':'/test','review_after':(now-timedelta(days=1)).isoformat()}]):
            self.assertEqual(cooling_targets(now),set())
    def test_bad_synthesis_does_not_replace_good_note(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'weekly.md';p.write_text('GOOD')
            with patch.object(weekly,'OUT_FILE',str(p)):
                with self.assertRaises(ValueError): weekly.write_synthesis_note({})
            self.assertEqual(p.read_text(),'GOOD')

if __name__=='__main__':unittest.main()
