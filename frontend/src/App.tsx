import RoomManagement from './components/RoomManagement';
import ReservationRegistration from './components/ReservationRegistration';

export default function App() {
  if (window.location.pathname === '/rooms') {
    return <RoomManagement />;
  }

  return <ReservationRegistration />;
}
