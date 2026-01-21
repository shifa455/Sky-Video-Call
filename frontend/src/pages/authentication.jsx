// frontend/src/pages/authentication.jsx

import * as React from "react";
import {
  Avatar,
  Button,
  CssBaseline,
  TextField,
  Paper,
  Box,
  Grid,
  Snackbar,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { AuthContext } from "../contexts/AuthContext";

const defaultTheme = createTheme();

export default function Authentication() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [formState, setFormState] = React.useState(0); // 0 = login, 1 = register
  const [snackbar, setSnackbar] = React.useState({ open: false, message: "", type: "info" });

  const { handleRegister, handleLogin } = React.useContext(AuthContext);

  const resetForm = () => {
    setName("");
    setUsername("");
    setPassword("");
  };

  const handleAuth = async () => {
    if (!username || !password || (formState === 1 && !name)) {
      setSnackbar({ open: true, message: "Please fill all required fields", type: "error" });
      return;
    }

    try {
      if (formState === 0) {
        await handleLogin(username, password);
      } else {
        const result = await handleRegister(name, username, password);
        setSnackbar({ open: true, message: result, type: "success" });
        resetForm();
        setFormState(0);
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Something went wrong", type: "error" });
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Grid container component="main" sx={{ height: "100vh" }}>
        <CssBaseline />

        {/* Left side background */}
        <Grid
          item
          xs={false}
          sm={4}
          md={7}
          sx={{
            backgroundImage: "url(https://source.unsplash.com/random?wallpapers)",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Right side form */}
        <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
          <Box
            sx={{
              my: 8,
              mx: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
              <LockOutlinedIcon />
            </Avatar>

            {/* Toggle buttons */}
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant={formState === 0 ? "contained" : "outlined"}
                onClick={() => setFormState(0)}
              >
                Sign In
              </Button>
              <Button
                variant={formState === 1 ? "contained" : "outlined"}
                onClick={() => setFormState(1)}
              >
                Sign Up
              </Button>
            </Box>

            {/* Form fields */}
            <Box sx={{ mt: 2, width: "100%" }}>
              {formState === 1 && (
                <TextField
                  margin="normal"
                  fullWidth
                  required
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}

              <TextField
                margin="normal"
                fullWidth
                required
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <TextField
                margin="normal"
                fullWidth
                required
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 3 }}
                onClick={handleAuth}
              >
                {formState === 0 ? "Login" : "Register"}
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        message={snackbar.message}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />
    </ThemeProvider>
  );
}