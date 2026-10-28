import RoomManagement from './components/RoomManagement';

export default function App() {
  if (window.location.pathname === '/rooms') {
    return <RoomManagement />;
  }

  return (
    <main className="container">
      <header className="header">
        <h1>会議室予約システム</h1>
      </header>
      <p>会議室の登録・編集・削除を行います。</p>
      <a href="/rooms">会議室を管理する</a>
    </main>
  );
}
