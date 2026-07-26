import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="fr">
      <Head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#2563EB" />
        <meta name="description" content="TheCoachAssistant — gestion, scouting et analyse pour équipes de football amateur." />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
