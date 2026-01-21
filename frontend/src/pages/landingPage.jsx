import React from 'react'
import "../App.css"
import { Link, useNavigate } from 'react-router-dom'

export default function LandingPage() {
    const router = useNavigate();

    return (
        <div className='landingPageContainer'>
            <nav className='navBar'>
                <div className='navHeader'>
                    <h2>Apna Video Call</h2>
                </div>

                <div className='navList'>
                    <button className='navButton' onClick={() => router("/aljk23")}>
                        Join as Guest
                    </button>
                    <button className='navButton' onClick={() => router("/auth")}>
                        Register
                    </button>
                    <button className='navButton' onClick={() => router("/auth")}>
                        Login
                    </button>
                </div>
            </nav>

            <div className="landingMainContainer">
                <div className="landingText">
                    <h1>
                        <span style={{ color: "#FF9839" }}>Connect</span> with your loved Ones
                    </h1>

                    <p>Cover a distance by Apna Video Call</p>

                    <Link to="/auth" className="getStartedButton">
                        Get Started
                    </Link>
                </div>

                <div className="landingImage">
                    <img src="/mobile.png" alt="Mobile Video Call" />
                </div>
            </div>
        </div>
    )
}
