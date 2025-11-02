import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between border-b px-4 py-2">
      <Link href="/" className="font-semibold">MandarinTalk</Link>
      <div className="flex items-center gap-3 text-sm">
        <Link href="/" className="underline-offset-2 hover:underline">Dashboard</Link>
        <Link href="/practice" className="underline-offset-2 hover:underline">Practice</Link>
        <Link href="/progress" className="underline-offset-2 hover:underline">Progress</Link>
      </div>
    </nav>
  );
}


