document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  let username = '';
  let profilePic = '';
  let messageImage = null;

  const messagesDiv = document.querySelector('.messages');
  const messageInput = document.getElementById('message-text');
  const sendButton = document.getElementById('send-button');
  const usernameInput = document.getElementById('username-input');
  const joinButton = document.getElementById('join-button');
  const loginModal = document.getElementById('login-modal');
  const usersList = document.querySelector('.users-list');
  const profilePicUpload = document.getElementById('profile-pic-upload');
  const profilePreview = document.getElementById('profile-preview');
  const currentUserPic = document.getElementById('current-user-pic');
  const imageUpload = document.getElementById('image-upload');


  function toggleForms() {
    document.getElementById('signup-form').classList.toggle('hidden');
    document.getElementById('login-form').classList.toggle('hidden');
  }
  
  
  
  async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
  
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
  
        const data = await response.json();
        
        if (response.ok) {
            alert('Login successful!');
            // Redirect or update UI as needed
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Error during login');
    }
  }
  
  // Profile picture upload handling
  profilePicUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
          const formData = new FormData();
          formData.append('image', file);

          try {
              const response = await fetch('/upload/profile', {
                  method: 'POST',
                  body: formData
              });
              const data = await response.json();
              profilePic = data.filename;
              profilePreview.src = profilePic;
          } catch (err) {
              console.error('Error uploading profile picture:', err);
          }
      }
  });

  // Message image upload handling
  imageUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
          const formData = new FormData();
          formData.append('image', file);

          try {
              const response = await fetch('/upload/message', {
                  method: 'POST',
                  body: formData
              });
              const data = await response.json();
              messageImage = data.filename;
              
              // Show preview
              const previewDiv = document.createElement('div');
              previewDiv.classList.add('message-preview');
              previewDiv.innerHTML = `
                  <img src="${messageImage}" alt="Message image">
                  <span class="remove-preview">✕</span>
              `;
              messageInput.parentElement.insertBefore(previewDiv, messageInput);
              
              previewDiv.querySelector('.remove-preview').onclick = () => {
                  previewDiv.remove();
                  messageImage = null;
              };
          } catch (err) {
              console.error('Error uploading message image:', err);
          }
      }
  });

  // Join chat handling
  joinButton.addEventListener('click', () => {
      username = usernameInput.value.trim();
      if (username) {
          loginModal.style.display = 'none';
          currentUserPic.src = profilePic || '/api/placeholder/40/40';
          socket.emit('user_join', { username, profilePic });
      }
  });

  // Send message handling
  function sendMessage() {
      const text = messageInput.value.trim();
      if (text || messageImage) {
          socket.emit('send_message', { 
              text,
              image: messageImage
          });
          messageInput.value = '';
          messageImage = null;
          
          // Remove image preview if exists
          const preview = document.querySelector('.message-preview');
          if (preview) {
              preview.remove();
          }
      }
  }

  sendButton.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
          sendMessage();
      }
  });

  // Socket event handlers
  socket.on('user_joined', (data) => {
      updateUsersList(data.users);
      appendMessage({
          text: `${data.username} joined the chat`,
          system: true
      });
  });

  socket.on('user_left', (data) => {
      updateUsersList(data.users);
      appendMessage({
          text: `${data.username} left the chat`,
          system: true
      });
  });

  socket.on('new_message', (message) => {
      appendMessage(message);
  });

  // Helper functions
    function updateUsersList(users) {
        usersList.innerHTML = users
            .map(user => `
                <div class="user-item">
                    <img src="${user.profilePic}" alt="${user.username}" class="profile-pic">
                    ${user.username}
                </div>
            `)
            .join('');
    }

  function appendMessage(message) {
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('message');
      
      if (message.system) {
          messageDiv.style.textAlign = 'center';
          messageDiv.style.color = '#667781';
          messageDiv.textContent = message.text;
      } else {
          messageDiv.classList.add(message.user === username ? 'sent' : 'received');
          let content = `
              <div class="message-header">
                  <img src="${message.profilePic}" alt="${message.user}" class="profile-pic">
                  <strong>${message.user}</strong>
              </div>
          `;
          
          if (message.text) {
              content += `<p>${message.text}</p>`;
          }
          
          if (message.image) {
              content += `<img src="${message.image}" alt="Shared image" class="message-image">`;
          }
          
          content += `<div class="timestamp">${new Date(message.timestamp).toLocaleTimeString()}</div>`;
          messageDiv.innerHTML = content;
      }
      
      messagesDiv.appendChild(messageDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
});