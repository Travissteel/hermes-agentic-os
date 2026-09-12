import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[1]))
from leadgen_gsc_report import choose_inspections, classify, resolve_property
class ReportTests(unittest.TestCase):
    def test_legal_pages_never_drive_work(self):
        urls=['https://x.test/privacy','https://x.test/contact','https://x.test/services/full-house','https://x.test/faq/cost']
        self.assertEqual(set(choose_inspections(urls,{},8)),set(urls[2:]))
    def test_services_ahead_of_sitemap_order(self):
        urls=['https://x.test/faq/cost','https://x.test/services/full-house']
        self.assertEqual(choose_inspections(urls,{},1),urls[1:])
    def test_rotation_uses_oldest_check(self):
        a,b='https://x.test/services/a','https://x.test/services/b'
        self.assertEqual(choose_inspections([a,b],{a:{'checked_at':'2026-09-12'},b:{'checked_at':'2026-09-01'}},1),[b])
    def test_index_status_never_from_impressions(self):
        self.assertEqual(classify({'impressions':0}),'UNKNOWN')
        self.assertEqual(classify({'verdict':'PASS','impressions':0}),'INDEXED')
    def test_error_is_unknown(self):
        self.assertEqual(classify({'error':'403'}),'UNKNOWN')
        self.assertEqual(classify(None),'UNKNOWN')
    def test_lookalike_property_rejected(self):
        self.assertIsNone(resolve_property(['https://notexample.com/'],'https://example.com'))
    def test_exact_property_preferred(self):
        self.assertEqual(resolve_property(['https://example.com/','sc-domain:example.com'],'https://www.example.com'),'sc-domain:example.com')
    def test_zero_budget(self):
        self.assertEqual(choose_inspections(['https://x.test/services/a'],{},0),[])

class FailureReportingTests(unittest.TestCase):
    def test_query_failure_is_unknown_not_zero(self):
        from unittest.mock import Mock, patch
        from datetime import datetime, timezone
        from leadgen_gsc_report import build_report
        svc=Mock()
        svc.sites.return_value.list.return_value.execute.return_value={'siteEntry':[{'siteUrl':'sc-domain:x.test','permissionLevel':'siteOwner'}]}
        site={'slug':'test','domain':'https://x.test','service':'Test','location':'Test'}
        with patch('leadgen_gsc_report.query',side_effect=RuntimeError('temporary API failure')):
            report,data=build_report(svc,[site],28,8,{},datetime.now(timezone.utc))
        self.assertFalse(data['ok'])
        self.assertNotIn('impressions',data['sites'][0])
        self.assertIn('UNKNOWN: Search Console query failed',report)
        self.assertNotIn('0 clicks',report)

if __name__=='__main__': unittest.main()
