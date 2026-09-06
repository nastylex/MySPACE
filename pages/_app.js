import { Inter, Space_Grotesk } from 'next/font/google';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });

export default function App({ Component, pageProps }) {
  return (
    <div className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <Component {...pageProps} />
    </div>
  );
}
