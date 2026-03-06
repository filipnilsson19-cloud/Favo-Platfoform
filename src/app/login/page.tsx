import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { getCurrentAppUser } from "@/server/auth-store";

import { loginAction } from "./actions";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Logga in | FAVO Platform",
  description: "Logga in till FAVOs interna personalportal.",
};

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const nextPath = getParam(params, "next") || "/";
  const errorMessage = getParam(params, "error");
  const authConfigured = hasSupabaseAuthEnv();

  if (authConfigured) {
    const appUser = await getCurrentAppUser();

    if (appUser) {
      redirect(nextPath.startsWith("/") ? nextPath : "/");
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.brandLockup}>
          <Image
            src="/favo-logotype.png"
            alt="FAVO"
            width={178}
            height={41}
            className={styles.brandLogo}
            priority
          />
          <div className={styles.brandCopy}>
            <p className={styles.eyebrow}>Personalportal</p>
            <h1>Logga in till FAVO</h1>
            <p>
              Recept, stationsvyer och rutiner samlade i ett internt verktyg för
              köksteamet.
            </p>
          </div>
        </div>

        {authConfigured ? (
          <form className={styles.form} action={loginAction}>
            <input type="hidden" name="next" value={nextPath} />

            <label className={styles.field}>
              <span>E-post</span>
              <input
                className={styles.input}
                type="email"
                name="email"
                autoComplete="email"
                placeholder="namn@favo.se"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Lösenord</span>
              <input
                className={styles.input}
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Skriv lösenord"
                required
              />
            </label>

            {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

            <button className={styles.submit} type="submit">
              Logga in
            </button>

            <p className={styles.hint}>
              Första testanvändare lägger du tills vidare in via Supabase under
              <strong> Authentication → Users</strong>. Första personen som loggar
              in får automatiskt rollen <strong>admin</strong>.
            </p>
          </form>
        ) : (
          <div className={styles.setupBox}>
            <h2>Auth behöver två nycklar till</h2>
            <p>
              Lägg till <code>NEXT_PUBLIC_SUPABASE_URL</code> och{" "}
              <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> i{" "}
              <code>.env.local</code>, starta om appen och öppna sedan den här
              sidan igen.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
