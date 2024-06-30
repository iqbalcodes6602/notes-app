const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // Import uuid
const Note = require('./Note');

require('dotenv').config();

mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection;

db.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

db.once('open', () => {
    console.log('Connected to MongoDB successfully');

    const app = express();
    const server = http.createServer(app);
    const io = socketIo(server, {
        cors: {
            origin: process.env.FRONTEND_URL,
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type'],
            credentials: true
        }
    });

    app.use(cors({
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true
    }));

    io.on('connection', async (socket) => {
        console.log('New client connected');

        socket.on('joinRoom', async (roomId) => {
            socket.join(roomId);
            try {
                const notes = await Note.find({ roomId });
                socket.emit('initialNotes', notes);
            } catch (err) {
                console.error(err);
            }
        });

        socket.on('newRoom', async () => {
            const roomId = uuidv4();
            socket.emit('roomCreated', roomId);
        });

        socket.on('newNote', async (note) => {
            try {
                const newNote = new Note(note);
                await newNote.save();
                io.to(note.roomId).emit('newNote', newNote); // Broadcast to room
            } catch (err) {
                console.error(err);
            }
        });

        socket.on('updateNote', async (updatedNote) => {
            try {
                io.to(updatedNote.roomId).emit('updateNote', updatedNote); // Broadcast to room
            } catch (err) {
                console.error(err);
            }
        });

        socket.on('saveNote', async (updatedNote) => {
            try {
                await Note.findByIdAndUpdate(updatedNote._id, updatedNote, { new: true });
            } catch (err) {
                console.error(err);
            }
        });

        socket.on('updateNoteContent', async (updatedNote) => {
            try {
                await Note.findByIdAndUpdate(updatedNote._id, updatedNote, { new: true });
                io.to(updatedNote.roomId).emit('updateNoteContent', updatedNote); // Broadcast to room
            } catch (err) {
                console.error(err);
            }
        });

        socket.on('deleteNote', async (noteId, roomId) => {
            try {
                await Note.findByIdAndDelete(noteId);
                io.to(roomId).emit('deleteNote', noteId); // Broadcast to room
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
