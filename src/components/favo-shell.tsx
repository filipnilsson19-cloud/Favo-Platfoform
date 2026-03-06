import Image from "next/image";

import { logoutAction } from "@/app/login/actions";
import {
  BookIcon,
  DocumentIcon,
  HomeIcon,
  PrepIcon,
  SearchIcon,
  ShieldIcon,
  StarIcon,
} from "@/components/navigation-icons";
import type { AppUser } from "@/types/auth";

import styles from "./favo-shell.module.css";

const primaryNav = [
  { label: "Hem", icon: HomeIcon, active: false },
  { label: "Recept", icon: BookIcon, active: true },
  { label: "Produktionsprepp", icon: PrepIcon, active: false },
  { label: "Rutiner", icon: ShieldIcon, active: false },
  { label: "Handbok", icon: DocumentIcon, active: false },
];

const secondaryNav = [
  { label: "Utbildning", icon: StarIcon },
  { label: "Sök", icon: SearchIcon },
];

type FavoShellProps = {
  authEnabled: boolean;
  children: React.ReactNode;
  user: AppUser;
};

export function FavoShell({ authEnabled, children, user }: FavoShellProps) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Huvudmeny">
        <a className={styles.brand} href="#" aria-label="FAVO">
          <span className={styles.brandCrop}>
            <Image
              src="/favo-logotype.png"
              alt="FAVO"
              width={178}
              height={41}
              className={styles.brandLogo}
              priority
            />
          </span>
        </a>

        <nav className={styles.nav} aria-label="Primär navigation">
          {primaryNav.map((item) => {
            const Icon = item.icon;

            return (
              <a
                key={item.label}
                className={`${styles.navLink} ${item.active ? styles.navLinkActive : ""}`}
                href="#"
                aria-current={item.active ? "page" : undefined}
              >
                <span className={styles.iconWrap} aria-hidden="true">
                  <Icon />
                </span>
                <span className={styles.label}>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className={styles.footer}>
          {secondaryNav.map((item) => {
            const Icon = item.icon;

            return (
              <a key={item.label} className={styles.navLink} href="#">
                <span className={styles.iconWrap} aria-hidden="true">
                  <Icon />
                </span>
                <span className={styles.label}>{item.label}</span>
              </a>
            );
          })}

          <div className={styles.sessionCard}>
            <div className={styles.sessionMeta}>
              <strong>{user.displayName}</strong>
              <span>
                {authEnabled
                  ? user.role === "admin"
                    ? "Admin"
                    : "Personal"
                  : "Lokalt förhandsläge"}
              </span>
            </div>

            {authEnabled ? (
              <form action={logoutAction}>
                <button className={styles.sessionButton} type="submit">
                  Logga ut
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </aside>

      <main className={styles.canvas}>{children}</main>
    </div>
  );
}
