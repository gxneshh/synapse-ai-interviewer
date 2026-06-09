import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Synapse - AI Interviewer</title>
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-3xl">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent mb-4">
              Synapse
            </h1>
            <p className="text-2xl text-gray-300 mb-2">Real-Time AI Interviewer</p>
            <p className="text-gray-400">Experience conversational technical interviews powered by cutting-edge AI</p>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="text-lg font-semibold text-white mb-2">Sub-Second Response</h3>
              <p className="text-gray-400 text-sm">AI responds in &lt;1 second for natural conversation</p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="text-3xl mb-2">🧠</div>
              <h3 className="text-lg font-semibold text-white mb-2">Intelligent Questions</h3>
              <p className="text-gray-400 text-sm">Adaptive questioning based on your resume & role</p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="text-3xl mb-2">🎤</div>
              <h3 className="text-lg font-semibold text-white mb-2">Human-Like Voice</h3>
              <p className="text-gray-400 text-sm">Natural-sounding responses with real interview feel</p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="text-3xl mb-2">🔄</div>
              <h3 className="text-lg font-semibold text-white mb-2">Smart Interruption Handling</h3>
              <p className="text-gray-400 text-sm">Mimics real interview with interruption awareness</p>
            </div>
          </div>

          {/* How it Works */}
          <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">How It Works</h2>
            <div className="grid md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold">
                  1
                </div>
                <p className="text-sm text-gray-400">You Speak</p>
              </div>
              <div className="flex items-center justify-center">→</div>
              <div>
                <div className="bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold">
                  2
                </div>
                <p className="text-sm text-gray-400">AI Listens</p>
              </div>
              <div className="flex items-center justify-center">→</div>
              <div>
                <div className="bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold">
                  3
                </div>
                <p className="text-sm text-gray-400">AI Responds</p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => router.push('/interview')}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-bold text-lg transition-all transform hover:scale-105"
          >
            Start Interview
          </button>

          <p className="text-gray-500 text-sm mt-6">
            20-minute technical interview • No experience necessary
          </p>
        </div>
      </main>
    </>
  );
}
