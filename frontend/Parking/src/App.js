import "./App.css";
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignIn from "./pages/SignIn.jsx";
import SignUp from "./pages/SignUp.jsx";
import Home from "./pages/Home.jsx";
import CameraComponent from "./pages/CameraComponent";
import MonthlyTicket from "./pages/MonthlyTicket.jsx";
import PriceSettings from "./pages/PriceSettings.jsx";
import Profile from "./pages/Profile.jsx";
import Navbar from "./components/Navbar.jsx";
import CreateAccount from "./pages/CreateAccount.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/" element={<Home />} />
        <Route path="/camera" element={<CameraComponent />} />
        <Route path="/month-ticket" element={<MonthlyTicket />} />
        <Route path="/price-settings" element={<PriceSettings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;


