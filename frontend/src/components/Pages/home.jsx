import axios from 'axios';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout, setOnlineUser , setSocketConnection, setUser  } from '../../redux/userSlice.jsx';
import Sidebar from '../Sidebar.jsx';
import logo from '../../assets/logo.png';
import io from 'socket.io-client';

const Home = () => {
  const user = useSelector(state => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  console.log('user', user);

  // Fetch user details from the server
  const fetchUserDetails = async () => {
    try {
      const URL = `${import.meta.env.VITE_BACKEND_URL}user-details`;
      const response = await axios({
        url: URL,
        withCredentials: true,
      });

      dispatch(setUser (response.data.data));

      if (response.data.data.logout) {
        dispatch(logout());
        navigate("/email");
        return;
      }
      console.log("current user Details", response);
    } catch (error) {
      console.log("error", error);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, []);

  /*** Socket connection ***/
  useEffect(() => {
    const URL = `${import.meta.env.VITE_BACKEND_URL}`;
    const socketConnection = io(URL, {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    // Listen for online users
    socketConnection.on('onlineUser  ', (data) => {
      console.log("Online users:", data);
      dispatch(setOnlineUser (data)); // Update Redux state with online users
    });

    // Listen for conversations
    socketConnection.on('conversation', (conversation) => {
      // Handle the conversation data
      console.log("Received conversation:", conversation);
      // You may want to update the sidebar or state here
    });

    // Listen for new messages
    socketConnection.on('message', (messages) => {
      console.log("New messages:", messages);
      // Handle the new messages, e.g., update the chat UI
    });

    dispatch(setSocketConnection(socketConnection));

    return () => {
      socketConnection.disconnect();
    };
  }, []);

  const basePath = location.pathname === '/';
  return (
    <div className='grid lg:grid-cols-[300px,1fr] h-screen max-h-screen'>
      <section className={`bg-white ${!basePath && "hidden"} lg:block`}>
        <Sidebar />
      </section>

      {/** Message component **/}
      <section className={`${basePath && "hidden"}`}>
        <Outlet />
      </section>

      <div className={`justify-center items-center flex-col gap-2 hidden ${!basePath ? "hidden" : "lg:flex"}`}>
        <div>
          <img
            src={logo}
            width={250}
            alt='logo'
          />
        </div>
        <p className='text-lg mt-2 text-slate-500'>Select user to send message</p>
      </div>
    </div>
  );
};

export default Home;