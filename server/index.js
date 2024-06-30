const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const Note = require('./Note');

require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection;

db.on('error', (err) => {
    console.error('MongoDB connection error:', err);
    // You can take additional actions here if needed
});

db.once('open', () => {
    console.log('Connected to MongoDB successfully');
    // You can start your application logic here
    const app = express();
    const server = http.createServer(app);
    const io = socketIo(server, {
        cors: {
            origin: process.env.FRONTEND_URL, // Frontend URL
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type'],
            credentials: true
        }
    });

    // Enable CORS
    app.use(cors({
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true
    }));



    io.on('connection', async (socket) => {
        console.log('New client connected');

        try {
            // Send all notes to the client
            const notes = await Note.find({});
            socket.emit('initialNotes', notes);
        } catch (err) {
            console.error(err);
        }

        // Listen for new notes
        socket.on('newNote', async (note) => {
            try {
                const newNote = new Note(note);
                await newNote.save();
                io.emit('newNote', newNote); // Broadcast new note to all clients
            } catch (err) {
                console.error(err);
            }
        });

        // Listen for note updates (position)
        socket.on('updateNote', async (updatedNote) => {
            try {
                // Broadcast updated note to all clients
                io.emit('updateNote', updatedNote);
            } catch (err) {
                console.error(err);
            }
        });

        // Listen for saving note position
        socket.on('saveNote', async (updatedNote) => {
            try {
                await Note.findByIdAndUpdate(updatedNote._id, updatedNote, { new: true });
            } catch (err) {
                console.error(err);
            }
        });

        // Listen for text content update
        socket.on('updateNoteContent', async (updatedNote) => {
            try {
                await Note.findByIdAndUpdate(updatedNote._id, updatedNote, { new: true });
                io.emit('updateNoteContent', updatedNote); // Broadcast updated note content to all clients
            } catch (err) {
                console.error(err);
            }
        });

        // Listen for deleting a note
        socket.on('deleteNote', async (noteId) => {
            try {
                await Note.findByIdAndDelete(noteId);
                io.emit('deleteNote', noteId); // Broadcast note deletion to all clients
            } catch (err) {
                console.error(err);
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });
    });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

});
