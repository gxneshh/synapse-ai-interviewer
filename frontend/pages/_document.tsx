import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Synapse - Real-Time AI Interviewer" />
      </Head>
      <body className="bg-gray-950">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
