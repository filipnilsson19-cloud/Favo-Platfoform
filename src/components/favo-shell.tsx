import Image from "next/image";
import Link from "next/link";

import { logoutAction } from "@/app/login/actions";
import { SearchIcon, StarIcon } from "@/components/navigation-icons";
import type { AppUser } from "@/types/auth";

import { FavoNav } from "./favo-nav";
import styles from "./favo-shell.module.css";

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
        <Link className={styles.brand} href="/" aria-label="FAVO">
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
        </Link>

        <FavoNav />

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
