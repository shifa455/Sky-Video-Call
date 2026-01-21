import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import "../App.css";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className='landingPageContainer'>
      <nav className='navBar'>
        <div className='navHeader'>
          <h2>Sky Video Call</h2>
        </div>

        <div className='navList'>
          <p style={{ cursor: 'pointer' }} onClick={() => navigate("/guest")}>Join as Guest</p>
          <p style={{ cursor: 'pointer' }} onClick={() => navigate("/auth")}>Register</p>
          <p style={{ cursor: 'pointer' }} onClick={() => navigate("/auth")}>Login</p>
        </div>
      </nav>

      <div className="landingMainContainer">
        <div className="landingText">
          <h1>
            <span style={{ color: "#FF9839" }}>Connect</span> with your loved ones
          </h1>
          <p>Bridge the distance with Sky Video Call</p>
          <Link className="getStartedButton" to="/auth">
            Get Started
          </Link>
        </div>

        <div className="landingImage">
          <img src="/mobile.png" alt="Mobile Video Call" />
        </div>
      </div>
    </div>
  );
}
