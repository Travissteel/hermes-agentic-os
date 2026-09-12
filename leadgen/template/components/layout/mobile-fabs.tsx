"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SITE } from "@/site.config";
import { telHref } from "@/components/call-button";
import { Icon } from "@/components/icons";

export function MobileFabs() {
  const pathname = usePathname();
  const [formVisible, setFormVisible] = useState(false);
  useEffect(() => {
    const forms = Array.from(document.querySelectorAll("form"));
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      setFormVisible(visible.size > 0);
    });
    forms.forEach((form) => observer.observe(form));
    return () => observer.disconnect();
  }, [pathname]);
  const quoteHref = pathname === "/" || pathname === "/contact" ? "#quote" : "/contact#quote";
  return (
    <div className="fabs" style={formVisible ? { display: "none" } : undefined}>
      {SITE.phoneDisplay && <a href={telHref()} aria-label={`Call ${SITE.phoneDisplay}`} className="fab bg-primary text-white"><Icon name="phone" className="h-5 w-5" /><span>Call</span></a>}
      <Link href={quoteHref} className="fab bg-accent text-on-accent"><Icon name="clipboard" className="h-5 w-5" /><span>Get a quote</span></Link>
    </div>
  );
}
