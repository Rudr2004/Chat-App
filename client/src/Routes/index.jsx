
import { createBrowserRouter } from "react-router-dom";
import App from "../App.jsx";
import RegisterPage from "../components/Pages/register.jsx";
import CheckEmailPage from "../components/Pages/checkEmail.jsx";
import CheckPasswordPage from "../components/Pages/checkPassword.jsx";
import Home from "../components/Pages/home.jsx";
import MessagePage from "../components/Message.jsx";
import AuthLayouts from "../layout";
import Forgotpassword from "../components/Pages/forgotPassword.jsx";

const router = createBrowserRouter([
{
    path : "/",
    element : <App/>,
    children : [
        {
            path : "register",
            element : <AuthLayouts><RegisterPage/></AuthLayouts>
        },
        {
            path : 'email',
            element : <AuthLayouts><CheckEmailPage/></AuthLayouts>
        },
        {
            path : 'password',
            element : <AuthLayouts><CheckPasswordPage/></AuthLayouts>
        },
        {
            path : 'forgot-password',
            element : <AuthLayouts><Forgotpassword/></AuthLayouts>
        },
        {
            path : "",
            element : <Home/>,
            children : [
                {
                    path : ':userId',
                    element : <MessagePage/>
                }
            ]
        }
    ]
}
])

export default router
