import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const withAuth = (WrappedComponent) => {
  return (props) => {
    const navigate = useNavigate();
    const [isAuthChecked, setIsAuthChecked] = useState(false);

    useEffect(() => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/auth");
      } else {
        setIsAuthChecked(true);
      }
    }, [navigate]);

    // Only render the component after auth check
    if (!isAuthChecked) return null;

    return <WrappedComponent {...props} />;
  };
};

export default withAuth;




// import { useEffect } from "react";
// import { useNavigate } from "react-router-dom";

// const withAuth = (WrappedComponent) => {
//   return (props) => {
//     const navigate = useNavigate();
//     useEffect(() => {
//       if (!localStorage.getItem("token")) navigate("/auth");
//     }, [navigate]);
//     return <WrappedComponent {...props} />;
//   };
// };

// export default withAuth;
