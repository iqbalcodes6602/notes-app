import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Draggable from 'react-draggable';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.bubble.css';
import './App.css';
import { MdDragIndicator } from 'react-icons/md';
import { FaTrash } from 'react-icons/fa';
import { TbSquareRoundedPlusFilled } from 'react-icons/tb';
import { v4 as uuidv4 } from 'uuid';

const socket = io(process.env.REACT_APP_BACKEND_URL);

function App() {
  const [notes, setNotes] = useState([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [roomId, setRoomId] = useState('');

  useEffect(() => {
    const queryRoomId = new URLSearchParams(window.location.search).get('roomId');
    if (queryRoomId) {
      setRoomId(queryRoomId);
      socket.emit('joinRoom', queryRoomId);
    } else {
      const newRoomId = uuidv4();
      setRoomId(newRoomId);
      socket.emit('newRoom');
      window.history.pushState(null, '', `?roomId=${newRoomId}`);
    }

    socket.on('initialNotes', (initialNotes) => {
      setNotes(initialNotes);
    });

    socket.on('newNote', (note) => {
      setNotes((prevNotes) => [...prevNotes, note]);
    });

    socket.on('updateNote', (updatedNote) => {
      setNotes((prevNotes) =>
        prevNotes.map((note) => (note._id === updatedNote._id ? updatedNote : note))
      );
    });

    socket.on('updateNoteContent', (updatedNote) => {
      setNotes((prevNotes) =>
        prevNotes.map((note) => (note._id === updatedNote._id ? updatedNote : note))
      );
    });

    socket.on('deleteNote', (noteId) => {
      setNotes((prevNotes) => prevNotes.filter((note) => note._id !== noteId));
    });

    return () => {
      socket.off('initialNotes');
      socket.off('newNote');
      socket.off('updateNote');
      socket.off('updateNoteContent');
      socket.off('deleteNote');
    };
  }, []);

  const colors = ['#9BEDFD', '#D8D0FE', '#FEE33A', '#FEC0D9'];
  const getBgColor = () => {
    return colors[notes.length % 4];
  };

  const createNote = () => {
    const newNote = {
      content: newNoteContent,
      position: { x: 100, y: 100 },
      color: getBgColor(),
      roomId
    };
    socket.emit('newNote', newNote);
    setNewNoteContent('');
  };

  const updateNotePosition = (id, x, y) => {
    const updatedNote = notes.find((note) => note._id === id);
    if (updatedNote) {
      updatedNote.position = { x, y };
      socket.emit('updateNote', updatedNote);
    }
  };

  const saveNotePosition = (id) => {
    const updatedNote = notes.find((note) => note._id === id);
    if (updatedNote) {
      socket.emit('saveNote', updatedNote);
    }
  };

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  const updateNoteContent = debounce((id, content) => {
    const updatedNote = notes.find((note) => note._id === id);
    if (updatedNote) {
      updatedNote.content = content;
      socket.emit('updateNoteContent', updatedNote);
    }
  }, 300);

  const deleteNote = (id) => {
    socket.emit('deleteNote', id, roomId);
  };

  return (
    <div className='App'>
      <TbSquareRoundedPlusFilled className='create-new' onClick={createNote} />
      <div className='notes-container'>
        {notes.map((note) => (
          <Draggable
            key={note._id}
            position={{ x: note.position.x, y: note.position.y }}
            onDrag={(e, data) => updateNotePosition(note._id, data.x, data.y)}
            onStop={() => saveNotePosition(note._id)}
            handle='.draggingHandle'
          >
            <div className='note'>
              <span id='buttons'>
                <MdDragIndicator style={{ cursor: 'all-scroll', color: '#4a4a4a' }} className='draggingHandle' />
                <FaTrash style={{ cursor: 'pointer', color: '#4a4a4a' }} onClick={() => deleteNote(note._id)} />
              </span>
              <ReactQuill
                className='editor'
                value={note.content}
                onChange={(content) => updateNoteContent(note._id, content)}
                theme="bubble"
                style={{ backgroundColor: note.color }}
                modules={{
                  toolbar: [
                    [{ header: [1, 2, 3, 4, 5, 6, false] }, { font: [] }],
                    [{ list: "ordered" }, { list: "bullet" }, { align: [] }],
                    ["bold", "italic", "underline"],
                    [{ color: [] }, { background: [] }],
                    [{ script: "sub" }, { script: "super" }],
                    ["image", "blockquote", "code-block"],
                  ]
                }}
              />
            </div>
          </Draggable>
        ))}
      </div>
    </div>
  );
}

export default App;
