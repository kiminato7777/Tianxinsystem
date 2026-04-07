const usernameRef = document.getElementById("username");
const passwordRef = document.getElementById("password");
const loginForm = document.getElementById('loginForm');
const togglePassword = document.getElementById('togglePassword');
let failedAttempts = 0;

// Toggle Password Visibility
if (togglePassword) {
  togglePassword.addEventListener('click', function (e) {
    const type = passwordRef.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordRef.setAttribute('type', type);
    this.classList.toggle('fi-rr-eye-crossed');
    this.classList.toggle('fi-rr-eye');
  });
}

// Prevent Khmer Input in Password
if (passwordRef) {
  passwordRef.addEventListener('input', function (e) {
    const khmerRegex = /[\u1780-\u17FF\u19E0-\u19FF]/g;
    if (khmerRegex.test(this.value)) {
      this.value = this.value.replace(khmerRegex, '');
      // Shake animation
      this.parentElement.style.animation = "shake 0.5s ease";
      setTimeout(() => { this.parentElement.style.animation = "none"; }, 500);
      showCustomAlert("ពាក្យសម្ងាត់មិនអាចប្រើអក្សរ ឬលេខខ្មែរបានទេ!");
    }
  });
}

// Login Logic
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = usernameRef.value.trim();
    const password = passwordRef.value;

    if (!email || !password) {
      showCustomAlert("សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់!");
      return;
    }

    const loginBtn = document.getElementById('loginBtn');
    const originalText = loginBtn ? loginBtn.innerText : "Login";
    if (loginBtn) {
      loginBtn.innerText = "កំពុងចូល...";
      loginBtn.disabled = true;
    }

    firebase.auth().signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const uid = userCredential.user.uid;
        console.log("Logged in user:", uid);

        // Check if user still exists in Database (in case Admin deleted them from User Mgmt)
        return firebase.database().ref('users/' + uid).once('value').then(snapshot => {
          // If NOT admin AND NOT exists -> Block
          const adminEmail = window.ADMIN_EMAIL || 'admin@school.com';
          if (email !== adminEmail && !snapshot.exists()) {
            // User was deleted from DB -> Block Access
            firebase.auth().signOut().then(() => {
              showBlockedModal(); // SHOW NEW BEAUTIFUL MODAL
              if (loginBtn) {
                loginBtn.innerText = originalText;
                loginBtn.disabled = false;
              }
            });
          } else {
            // User exists -> Update Last Login, Email & Redirect
            return firebase.database().ref('users/' + uid).update({
              email: email,
              lastLogin: new Date().toISOString()
            }).then(() => {
              window.location.href = "/index.html";
            });
          }
        });
      })
      .catch((error) => {
        console.error("Login error:", error);
        let errorMessage = "មានបញ្ហាកក្នុងការចូលប្រើប្រាស់។";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-login-credentials') {
          errorMessage = "អ៊ីមែល ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវ!";
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = "ទម្រង់អ៊ីមែលមិនត្រឹមត្រូវ!";
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = "ការព្យាយាមចូលច្រើនដងពេក។ សូមរង់ចាំមួយសន្ទុះ!";
        } else {
          errorMessage = "មានបញ្ហាកក្នុងការចូល៖ " + error.message;
        }

        failedAttempts++;
        if (failedAttempts >= 3) {
          errorMessage = `អ្នកបានបញ្ចូលខុស ${failedAttempts} ដងហើយ! សូមទាក់ទងមកកាន់ IT Support តាមរយៈ Telegram: <a href="https://t.me/m_makara_m" target="_blank" style="color: #fff; text-decoration: underline; font-weight: bold;">https://t.me/m_makara_m</a>`;
          showCustomAlert(errorMessage, 8000);
        } else {
          showCustomAlert(errorMessage);
        }

        if (loginBtn) {
          loginBtn.innerText = originalText;
          loginBtn.disabled = false;
        }
      });
  });
}

function showCustomAlert(message, duration = 3000) {
  const alertBox = document.getElementById("customAlert");
  if (!alertBox) return;
  alertBox.innerHTML = message;
  alertBox.style.display = "block";

  // Prevent multiple timers from conflicting
  if (window.alertTimeout) clearTimeout(window.alertTimeout);

  window.alertTimeout = setTimeout(() => {
    alertBox.style.display = "none";
  }, duration);
}

// Check auth state
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    // window.location.href = "index.html";
  }
});

// Modal Helpers
function showBlockedModal() {
  const modal = document.getElementById('blockedModal');
  if (modal) modal.style.display = 'flex';
}

function closeBlockedModal() {
  const modal = document.getElementById('blockedModal');
  if (modal) modal.style.display = 'none';
  // Clear query param to avoid re-showing on refresh
  const url = new URL(window.location);
  url.searchParams.delete('error');
  window.history.replaceState({}, '', url);
}

// Check for blocked param on load
window.addEventListener('load', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('error') === 'blocked') {
    showBlockedModal();
  } else if (params.get('error') === 'permission_denied') {
    showCustomAlert("⚠️ កំហុសសិទ្ធិចូលប្រើប្រាស់ (Permission Denied): គណនីរបស់អ្នកមិនទាន់ត្រូវបានកំណត់សិទ្ធិក្នុង Database ឬ Rules របស់ Firebase មានបញ្ហា។ សូមទាក់ទង Admin!", 10000);
  }
});

