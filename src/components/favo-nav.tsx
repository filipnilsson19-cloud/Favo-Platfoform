"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BookIcon,
  CalculatorIcon,
  DocumentIcon,
  PrepIcon,
} from "@/components/navigation-icons";

import styles from "./favo-shell.module.css";

const primaryNav = [
  { label: "Meny & lägglistor", icon: BookIcon, href: "/" },
  { label: "Recept & Produktion", icon: PrepIcon, href: "/prep" },
  { label: "Receptkalkyl", icon: CalculatorIcon, href: "/kalkyl" },
  { label: "Handbok", icon: DocumentIcon, href: "#" },
];

export function FavoNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Primär navigation">
      {primaryNav.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.label}
            className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
            href={item.href}
            prefetch
            aria-current={isActive ? "page" : undefined}
          >
            <span className={styles.iconWrap} aria-hidden="true">
              <Icon />
            </span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
