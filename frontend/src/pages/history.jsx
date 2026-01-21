import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import HomeIcon from "@mui/icons-material/Home";
import { IconButton, Snackbar } from "@mui/material";

export default function History() {
  const { getHistoryOfUser } = useContext(AuthContext);
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await getHistoryOfUser();
        setMeetings(history);
      } catch (err) {
        setError("Failed to load history");
      }
    };

    fetchHistory();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div style={{ padding: "20px" }}>
      <IconButton onClick={() => navigate("/home")}>
        <HomeIcon />
      </IconButton>

      {meetings.length === 0 ? (
        <Typography color="text.secondary">
          No meeting history found
        </Typography>
      ) : (
        meetings.map((meeting) => (
          <Card
            key={meeting._id}
            variant="outlined"
            sx={{ mb: 2 }}
          >
            <CardContent>
              <Typography sx={{ fontSize: 14 }} color="text.secondary">
                Code: {meeting.meetingCode}
              </Typography>

              <Typography sx={{ mt: 1 }} color="text.secondary">
                Date: {formatDate(meeting.date)}
              </Typography>
            </CardContent>
          </Card>
        ))
      )}

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={3000}
        message={error}
        onClose={() => setError("")}
      />
    </div>
  );
}
