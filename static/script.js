// HeartGuard - shared client script
(function () {
  // CSRF Helper
  function getCookie(name) {
      let cookieValue = null;
      if (document.cookie && document.cookie !== '') {
          const cookies = document.cookie.split(';');
          for (let i = 0; i < cookies.length; i++) {
              const cookie = cookies[i].trim();
              if (cookie.substring(0, name.length + 1) === (name + '=')) {
                  cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                  break;
              }
          }
      }
      return cookieValue;
  }

  function fetchAPI(url, options = {}) {
      const csrftoken = getCookie('csrftoken');
      const headers = {
          'Content-Type': 'application/json',
          ...options.headers
      };
      if (csrftoken) {
          headers['X-CSRFToken'] = csrftoken;
      }
      return fetch(url, { credentials: 'same-origin', ...options, headers }).then(async res => {
          const contentType = res.headers.get('content-type');
          let data = {};
          if (contentType && contentType.includes('application/json')) {
              data = await res.json();
          } else {
              data = { error: await res.text() };
          }
          return { status: res.status, data };
      }).catch(err => {
          console.error('Fetch error:', err);
          return { status: 500, data: { error: err.message } };
      });
  }

  // Sidebar HTML injected into each app page via <div id="sidebar-mount">
  function renderSidebar(user) {
      const name = user ? (user.first_name + ' ' + user.last_name).trim() || user.username : 'Guest';
      const email = user ? user.email : 'Please login';
      const initials = user ? (name.substring(0,2).toUpperCase()) : '??';

      const SIDEBAR_HTML = `
        <aside class="sidebar">
          <div class="brand">
            <div class="brand-logo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" fill="white"/>
              </svg>
            </div>
            HeartGuard
          </div>
          <nav class="nav">
            <a href="dashboard.html">${ico('grid')} Dashboard</a>
            <a href="assessment.html">${ico('plus')} New Assessment</a>
            <a href="result.html">${ico('activity')} Latest Result</a>
            <a href="reports.html">${ico('file')} Reports</a>
            <a href="profile.html">${ico('user')} Profile</a>
          </nav>
          <div class="foot">
            <div class="avatar">${initials}</div>
            <div class="foot-info">
              <b>${name}</b>
              <span>${email}</span>
            </div>
            <a href="#" id="logoutBtn" style="margin-left:auto; color:var(--text-muted); cursor:pointer;">&#x23FB;</a>
          </div>
        </aside>
      `;
      const mount = document.getElementById('sidebar-mount');
      if (mount) {
          mount.outerHTML = SIDEBAR_HTML;
          document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
              e.preventDefault();
              fetchAPI('/api/auth/logout/', { method: 'POST' }).then(() => {
                  location.href = 'login.html';
              });
          });
          
          const path = location.pathname.split('/').pop() || 'dashboard.html';
          document.querySelectorAll('.nav a').forEach(a => {
            const href = a.getAttribute('href');
            if (href === path) a.classList.add('active');
          });
      }
  }

  function ico(name) {
    const paths = {
      grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
      plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
      activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
      file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    // Check auth state
    const pathName = location.pathname.split('/').pop().replace('.html', '');
    const isPublic = ['login', 'register', 'index', ''].includes(pathName);
    let user = null;
    
    if (!isPublic || document.getElementById('sidebar-mount')) {
        const { status, data } = await fetchAPI('/api/auth/me/');
        if (status === 200) {
            user = data;
        } else if (!isPublic) {
            location.href = 'login.html';
            return;
        }
    }
    
    renderSidebar(user);

    // Update dynamic user elements
    if (user) {
        const fName = (user.first_name || '').trim();
        const lName = (user.last_name || '').trim();
        const fullName = [fName, lName].filter(Boolean).join(' ') || user.username;

        const welcomeName = document.getElementById('welcome-name');
        if (welcomeName) welcomeName.textContent = fName || user.username || 'there';

        const profileName = document.getElementById('profile-name');
        if (profileName) profileName.textContent = fullName;
        const profileEmail = document.getElementById('profile-email');
        if (profileEmail) profileEmail.textContent = user.email;
        const profileDate = document.getElementById('profile-date');
        if (profileDate) profileDate.textContent = 'Today'; // Date joined is not in user response yet
        const profileAvatar = document.getElementById('profile-avatar');
        if (profileAvatar) {
            if (user.profile_photo) {
                profileAvatar.innerHTML = `<img src="${user.profile_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            } else {
                const name = fName || user.username || 'User';
                profileAvatar.textContent = name.substring(0, 2).toUpperCase();
            }
        }
        const detailName = document.getElementById('detail-name');
        if (detailName) detailName.value = fullName;
        const detailEmail = document.getElementById('detail-email');
        if (detailEmail) detailEmail.value = user.email;
        const detailDob = document.getElementById('detail-dob');
        if (detailDob) detailDob.value = user.date_of_birth || '';
        const detailUnits = document.getElementById('detail-units');
        if (detailUnits) detailUnits.value = user.pref_units || 'Metric (mg/dL, mmHg)';
        const detailNotifications = document.getElementById('detail-notifications');
        if (detailNotifications) detailNotifications.value = user.pref_notifications || 'Weekly summary + assessment reminders';
        const detailSharing = document.getElementById('detail-sharing');
        if (detailSharing) detailSharing.value = user.pref_sharing || 'Anonymized model improvement only';
        
        // Auto-save logic for Profile page inputs
        document.querySelectorAll('.auto-save').forEach(input => {
            input.addEventListener('change', async () => {
                const payload = {};
                const dob = document.getElementById('detail-dob')?.value;
                if (dob !== undefined) payload.date_of_birth = dob || null;
                const units = document.getElementById('detail-units')?.value;
                if (units !== undefined) payload.pref_units = units;
                const notif = document.getElementById('detail-notifications')?.value;
                if (notif !== undefined) payload.pref_notifications = notif;
                const sharing = document.getElementById('detail-sharing')?.value;
                if (sharing !== undefined) payload.pref_sharing = sharing;
                
                await fetchAPI('/api/auth/me/', {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
            });
        });
        
        // Edit Profile Logic
        const editBtn = document.getElementById('editProfileBtn');
        const editModal = document.getElementById('editProfileModal');
        const closeEditBtn = document.getElementById('closeEditModalBtn');
        const editForm = document.getElementById('editProfileForm');
        const editNameInput = document.getElementById('editName');
        
        if (editBtn && editModal) {
            editBtn.addEventListener('click', () => {
                editNameInput.value = fullName;
                const editDob = document.getElementById('editDob');
                if(editDob) editDob.value = user.date_of_birth || '';
                const editUnits = document.getElementById('editUnits');
                if(editUnits) editUnits.value = user.pref_units || 'Metric (mg/dL, mmHg)';
                const editNotifications = document.getElementById('editNotifications');
                if(editNotifications) editNotifications.value = user.pref_notifications || 'Weekly summary + assessment reminders';
                const editSharing = document.getElementById('editSharing');
                if(editSharing) editSharing.value = user.pref_sharing || 'Anonymized model improvement only';
                editModal.style.display = 'flex';
            });
            closeEditBtn.addEventListener('click', () => editModal.style.display = 'none');
            
            async function submitProfile(payload) {
                const { status, data } = await fetchAPI('/api/auth/me/', {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                if (status === 200) {
                    location.reload();
                } else {
                    alert('Failed to update profile.');
                }
            }

            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newName = editNameInput.value.trim();
                const payload = {
                    name: newName,
                    date_of_birth: document.getElementById('editDob')?.value || null,
                    pref_units: document.getElementById('editUnits')?.value,
                    pref_notifications: document.getElementById('editNotifications')?.value,
                    pref_sharing: document.getElementById('editSharing')?.value,
                };
                const photoInput = document.getElementById('editPhoto');
                if (photoInput && photoInput.files && photoInput.files[0]) {
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                        payload.profile_photo = event.target.result;
                        await submitProfile(payload);
                    };
                    reader.readAsDataURL(photoInput.files[0]);
                } else {
                    await submitProfile(payload);
                }
            });
        }
    }

    // Forms
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const msgDiv = document.getElementById('authMessage');
      if (msgDiv) msgDiv.style.display = 'none';
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const { status, data } = await fetchAPI('/api/auth/login/', {
          method: 'POST',
          body: JSON.stringify({ email, password })
      });
      if (status === 200) {
          if (msgDiv) { msgDiv.style.display = 'block'; msgDiv.style.backgroundColor = 'rgba(52,211,153,0.14)'; msgDiv.style.color = 'var(--success)'; msgDiv.textContent = 'Login successful! Redirecting...'; }
          location.href = 'dashboard.html';
      } else {
          if (msgDiv) { msgDiv.style.display = 'block'; msgDiv.style.backgroundColor = 'rgba(239,68,68,0.14)'; msgDiv.style.color = 'var(--danger)'; msgDiv.textContent = data.error || 'Login failed: Invalid credentials'; }
      }
    });

    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.addEventListener('submit', async e => {
      e.preventDefault();
      try {
          const msgDiv = document.getElementById('authMessage');
          if (msgDiv) msgDiv.style.display = 'none';
          const name = document.getElementById('name').value;
          const email = document.getElementById('email').value;
          const p = document.getElementById('password').value;
          const c = document.getElementById('confirm').value;
          
          if (p.length < 8) {
              if (msgDiv) { msgDiv.style.display = 'block'; msgDiv.style.backgroundColor = 'rgba(239,68,68,0.14)'; msgDiv.style.color = 'var(--danger)'; msgDiv.textContent = 'Password must be at least 8 characters long.'; }
              return;
          }
          if (p !== c) { 
              if (msgDiv) { msgDiv.style.display = 'block'; msgDiv.style.backgroundColor = 'rgba(239,68,68,0.14)'; msgDiv.style.color = 'var(--danger)'; msgDiv.textContent = 'Entered and confirm passwords do not match.'; }
              return; 
          }
          
          const { status, data } = await fetchAPI('/api/auth/register/', {
              method: 'POST',
              body: JSON.stringify({ name, email, password: p })
          });
          if (status === 201) {
              if (msgDiv) { msgDiv.style.display = 'block'; msgDiv.style.backgroundColor = 'rgba(52,211,153,0.14)'; msgDiv.style.color = 'var(--success)'; msgDiv.textContent = 'Account created successfully! Redirecting...'; }
              location.href = 'dashboard.html';
          } else {
              if (msgDiv) { msgDiv.style.display = 'block'; msgDiv.style.backgroundColor = 'rgba(239,68,68,0.14)'; msgDiv.style.color = 'var(--danger)'; msgDiv.textContent = data.error || 'Registration failed'; }
          }
      } catch (error) {
          alert("CRITICAL ERROR: " + error.message);
      }
    });

    const assessForm = document.getElementById('assessForm');
    if (assessForm) assessForm.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(assessForm);
      
      const payload = {
          age: +fd.get('age') || 40,
          sex: fd.get('gender') === 'Male' ? 1 : 0,
          cp: document.getElementById('cp').selectedIndex,
          trestbps: +fd.get('bp') || 120,
          chol: +fd.get('chol') || 200,
          fbs: (+fd.get('sugar') > 120) ? 1 : 0,
          restecg: document.getElementById('ecg').selectedIndex,
          thalach: +fd.get('hr') || 75,
          exang: document.getElementById('exang').selectedIndex,
          oldpeak: +fd.get('oldpeak') || 0.0,
          slope: document.getElementById('slope').selectedIndex,
          ca: +fd.get('ca') || 0,
          thal: document.getElementById('thal').selectedIndex + 1, // 1,2,3
      };
      
      const { status, data } = await fetchAPI('/api/assess/', {
          method: 'POST',
          body: JSON.stringify(payload)
      });
      
      if (status === 201) {
          sessionStorage.setItem('hg_risk', String(data.risk_score));
          location.href = 'result.html';
      } else {
          alert('Error saving assessment');
      }
    });

    // Result gauge animation
    const gauge = document.querySelector('.circle-fill');
    if (gauge) {
      const risk = +sessionStorage.getItem('hg_risk') || 0;
      const R = +gauge.getAttribute('r');
      const C = 2 * Math.PI * R;
      gauge.setAttribute('stroke-dasharray', String(C));
      gauge.setAttribute('stroke-dashoffset', String(C));
      requestAnimationFrame(() => {
        gauge.setAttribute('stroke-dashoffset', String(C * (1 - risk / 100)));
      });
      const pct = document.querySelector('.gauge-text .pct');
      const tag = document.querySelector('.risk-tag');
      let level = 'Low Risk', cls = 'low', col = 'var(--success)';
      if (risk >= 70) { level = 'High Risk'; cls = 'high'; col = 'var(--danger)'; }
      else if (risk >= 40) { level = 'Moderate Risk'; cls = 'med'; col = 'var(--warning)'; }
      // animate number
      let n = 0;
      const step = Math.max(1, Math.round(risk / 40));
      const tick = setInterval(() => {
        n += step;
        if (n >= risk) { n = risk; clearInterval(tick); }
        pct.textContent = n + '%';
      }, 24);
      if (tag) {
        tag.textContent = level;
        tag.style.background = cls === 'high' ? 'rgba(239,68,68,0.14)' :
                               cls === 'med' ? 'rgba(251,191,36,0.14)' :
                               'rgba(52,211,153,0.14)';
        tag.style.color = col;
      }
      
      const recList = document.getElementById('recommendations-list');
      if (recList) {
        let recs = [];
        if (risk < 10) {
            recs = [
                '<b>Maintain your excellent cardiovascular health</b> by staying active most days of the week.',
                '<b>Consider a yearly routine check-up</b> to monitor your baseline lipid and metabolic panels.',
                '<b>Focus on a balanced diet</b> incorporating plenty of lean proteins, whole grains, and fresh vegetables.',
                '<b>Stay hydrated</b> by drinking adequate water daily, which supports overall circulatory health.',
                '<b>Prioritize mental wellbeing</b> through hobbies and relaxation to keep stress hormones in check.'
            ];
        } else if (risk < 20) {
            recs = [
                '<b>Aim for 150 minutes of moderate cardio</b> weekly, such as brisk walking, swimming, or cycling.',
                '<b>Focus on maintaining a healthy weight</b> to reduce any future strain on your heart.',
                '<b>Monitor your blood pressure annually</b> to catch any early upward trends.',
                '<b>Incorporate heart-healthy fats</b> like those found in avocados, nuts, and olive oil into your meals.',
                '<b>Ensure 7-9 hours of quality sleep</b> each night to support cardiovascular recovery.'
            ];
        } else if (risk < 30) {
            recs = [
                '<b>Slightly elevated risk detected</b>. Actively substitute saturated fats with healthy alternatives.',
                '<b>Monitor your daily sodium intake</b> to keep your blood pressure well within normal limits.',
                '<b>If you consume alcohol, do so in moderation</b> to prevent unwanted increases in triglycerides.',
                '<b>Incorporate resistance training</b> at least twice a week to improve metabolic health.',
                '<b>Add more soluble fiber</b> to your diet (like oats and beans) to help naturally lower cholesterol.'
            ];
        } else if (risk < 40) {
            recs = [
                '<b>Consider adopting a Mediterranean-style diet</b> rich in fish, legumes, and leafy greens.',
                '<b>Limit your intake of highly processed foods</b> and artificial trans fats.',
                '<b>Practice active stress management</b> techniques, such as mindfulness or deep breathing exercises.',
                '<b>Track your resting heart rate</b> occasionally; a lower resting rate indicates better heart efficiency.',
                '<b>Consider a bi-annual lipid panel</b> to ensure your cholesterol ratios remain healthy.'
            ];
        } else if (risk < 50) {
            recs = [
                '<b>Moderate risk detected</b>. Actively limit added sugars and refined carbohydrates in your daily meals.',
                '<b>Schedule a routine check-up</b> with your primary care provider in the next 6 months.',
                '<b>Increase your cardiovascular exercise intensity</b> safely, under guidance, to strengthen your heart.',
                '<b>Pay close attention to your BMI and waist circumference</b>, which are key metabolic risk indicators.',
                '<b>Consider tracking your daily food intake</b> to identify hidden sources of sodium and unhealthy fat.'
            ];
        } else if (risk < 60) {
            recs = [
                '<b>Your cardiovascular risk is notable</b>. Lower LDL cholesterol by reducing red meat consumption.',
                '<b>Engage in regular stress-reducing activities</b> like yoga or meditation.',
                '<b>Discuss daily preventative supplements</b> with your doctor if they align with your health history.',
                '<b>Strictly limit sugary beverages</b> and opt for water, herbal teas, or black coffee instead.',
                '<b>Increase your intake of Omega-3 fatty acids</b> through dietary sources like salmon or flaxseeds.'
            ];
        } else if (risk < 70) {
            recs = [
                '<b>You are bordering on high risk</b>. Strict sodium limitation (under 2,300 mg/day) is highly recommended.',
                '<b>Discuss potential preventative lifestyle interventions</b> or medications with your physician soon.',
                '<b>Avoid all forms of tobacco and vaping</b>, and minimize exposure to secondhand smoke.',
                '<b>Keep a close eye on your blood sugar levels</b>, as insulin resistance often accompanies high risk.',
                '<b>Break up long periods of sitting</b> by taking short, active breaks every hour.'
            ];
        } else if (risk < 80) {
            recs = [
                '<b>High risk alert</b>. Schedule a dedicated follow-up with your physician within the next 30 days.',
                '<b>A structured, medically supervised exercise plan</b> (cardiac rehab style) is highly advised.',
                '<b>Adopt a DASH diet</b> immediately to strictly control your blood pressure through nutrition.',
                '<b>Monitor your blood pressure at home</b> regularly and log the readings for your doctor.',
                '<b>Review your family medical history</b> with your doctor to identify any genetic risk factors.'
            ];
        } else if (risk < 90) {
            recs = [
                '<b>Very high risk</b>. Consult a cardiologist immediately to discuss a comprehensive management plan.',
                '<b>Strict adherence to prescribed medications</b> is absolutely crucial for your ongoing health.',
                '<b>Eliminate all dietary trans fats and minimize saturated fats</b> to halt further plaque buildup.',
                '<b>Learn the early warning signs</b> of a heart attack or stroke so you can seek emergency care if needed.',
                '<b>Work closely with a registered dietitian</b> to completely overhaul your daily nutritional habits safely.'
            ];
        } else {
            recs = [
                '<b>URGENT</b>: Your predicted risk is extremely high. Please seek immediate medical evaluation.',
                '<b>Significant and immediate medical interventions</b> are required to stabilize your cardiovascular system.',
                '<b>Do not begin any strenuous exercise program</b> without direct clearance from a cardiologist.',
                '<b>Ensure you have an emergency action plan</b> in place with your family and healthcare providers.',
                '<b>Follow all clinical guidelines and prescription regimens</b> exactly as instructed by your emergency care team.'
            ];
        }
        recList.innerHTML = recs.map(r => `<li><span class="check">✓</span><span>${r}</span></li>`).join('');
      }
    }

    // Dashboard Charts Data and Reports Table
    const lc = document.getElementById('lineChart');
    const dc = document.getElementById('donutChart');
    const reportsBody = document.getElementById('reportsBody');
    
    // Fetch assessments and update stats dynamically
    if (!isPublic) {
        const { status, data } = await fetchAPI('/api/assess/');
        if (status === 200) {
            let assessData = data || [];
            let totalAssessments = assessData.length;
            let latestRisk = 0;
            let healthScore = 100;
            if (totalAssessments > 0) {
                latestRisk = assessData[assessData.length - 1].risk_score;
                healthScore = 100 - latestRisk;
            }

            // Update DOM stats if they exist (Dashboard & Profile)
            const d1Val = document.querySelector('.d1 .value');
            const d2Val = document.querySelector('.d2 .value');
            const d3Val = document.querySelector('.d3 .value');
            const d4Val = document.querySelector('.d4 .value');

            if (pathName === 'dashboard') {
                if (d1Val) d1Val.innerHTML = `${healthScore}<span style="font-size:18px;color:var(--text-mute)">/100</span>`;
                if (d2Val) d2Val.textContent = `${assessData.length > 0 ? assessData[assessData.length-1].risk_score : 0}%`;
                if (d3Val) d3Val.textContent = `${totalAssessments}`;
                if (d4Val) {
                    if (totalAssessments > 0) {
                        const diffTime = Math.abs(new Date() - new Date(assessData[assessData.length-1].created_at));
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        d4Val.textContent = diffDays === 0 ? 'Today' : `${diffDays}d ago`;
                    } else {
                        d4Val.textContent = 'None';
                    }
                }
                
                const insightsContainer = document.getElementById('ai-insights-container');
                if (insightsContainer) {
                    let insights = [];
                    if (latestRisk < 10) {
                        insights = [
                            { icon: '↑', cls: 'good', title: 'Excellent Metrics', desc: 'Your cardiac indices remain in the optimal tier. Keep up the great work.' },
                            { icon: 'i', cls: '', title: 'Healthy Lifestyle Validated', desc: 'Your current diet and physical activity are maintaining a strong cardiovascular profile.' }
                        ];
                    } else if (latestRisk < 20) {
                        insights = [
                            { icon: '↑', cls: 'good', title: 'Optimal Output', desc: 'Your resting metrics indicate strong cardiovascular efficiency.' },
                            { icon: 'i', cls: '', title: 'Stay Active', desc: 'Aim to maintain your 150 minutes of weekly cardio to lock in this low risk.' }
                        ];
                    } else if (latestRisk < 30) {
                        insights = [
                            { icon: '!', cls: 'warn', title: 'Slight Elevated Risk', desc: 'Consider making minor dietary adjustments to substitute saturated fats.' },
                            { icon: 'i', cls: '', title: 'Routine Activity', desc: 'Regular resistance training could help improve your metabolic baseline further.' }
                        ];
                    } else if (latestRisk < 40) {
                        insights = [
                            { icon: '!', cls: 'warn', title: 'Moderate Risk Trending', desc: 'Your metrics indicate a shift towards moderate risk. Track your sodium intake closely.' },
                            { icon: 'i', cls: '', title: 'Sleep Optimization', desc: 'Ensure you are prioritizing 7-9 hours of sleep to reduce systemic stress.' }
                        ];
                    } else if (latestRisk < 50) {
                        insights = [
                            { icon: '!', cls: 'warn', title: 'Metabolic Markers Elevated', desc: 'It is highly advised to limit added sugars and refined carbohydrates.' },
                            { icon: 'i', cls: '', title: 'Time for a Check-up', desc: 'Schedule a routine check-up in the next 6 months to review your clinical metrics.' }
                        ];
                    } else if (latestRisk < 60) {
                        insights = [
                            { icon: '!', cls: 'warn', title: 'Lipid Profile Warning', desc: 'Your risk is notable. Lowering red meat consumption can improve LDL outcomes.' },
                            { icon: 'i', cls: '', title: 'Stress Evaluation', desc: 'Consider integrating stress-reducing activities, as elevated cortisol impacts the heart.' }
                        ];
                    } else if (latestRisk < 70) {
                        insights = [
                            { icon: '!', cls: 'warn', title: 'High Sodium Sensitivity', desc: 'Bordering on high risk. Strict sodium limitation under 2,300 mg/day is needed.' },
                            { icon: 'i', cls: '', title: 'Consult Recommended', desc: 'Discuss preventative lifestyle interventions or medications with your physician.' }
                        ];
                    } else if (latestRisk < 80) {
                        insights = [
                            { icon: '!', cls: 'warn', title: 'High Risk Identified', desc: 'Schedule a dedicated follow-up with your physician within 30 days.' },
                            { icon: 'i', cls: '', title: 'Medication Review', desc: 'Review your clinical family history and current prescriptions with your care provider.' }
                        ];
                    } else if (latestRisk < 90) {
                        insights = [
                            { icon: '!', cls: 'warn', title: 'Critical Arterial Load', desc: 'Very high risk detected. Strict adherence to prescribed medications is absolutely vital.' },
                            { icon: 'i', cls: '', title: 'Cardiologist Consult', desc: 'Consult a cardiologist immediately to formulate a comprehensive management plan.' }
                        ];
                    } else {
                        insights = [
                            { icon: '!', cls: 'warn', title: 'Urgent Emergency Risk', desc: 'Your predicted risk is critically high. Seek immediate medical evaluation.' },
                            { icon: 'i', cls: '', title: 'Do Not Exert Yourself', desc: 'Avoid strenuous physical activity until cleared by emergency care professionals.' }
                        ];
                    }
                    
                    insightsContainer.innerHTML = insights.map(ins => `
                        <div class="insight">
                          <div class="insight-icon ${ins.cls}">${ins.icon}</div>
                          <div class="insight-body">
                            <h4>${ins.title}</h4>
                            <p>${ins.desc}</p>
                          </div>
                        </div>
                    `).join('');
                }
            } else if (pathName === 'profile') {
                const statTotal = document.getElementById('stat-total-assessments');
                const statTotalDelta = document.getElementById('stat-total-assessments-delta');
                const statAvg = document.getElementById('stat-avg-risk');
                const statAvgDelta = document.getElementById('stat-avg-risk-delta');
                const statHealth = document.getElementById('stat-health-score');
                const statHealthDelta = document.getElementById('stat-health-score-delta');
                
                if (statTotal) {
                    statTotal.textContent = `${totalAssessments}`;
                    statTotalDelta.textContent = totalAssessments > 0 ? "Based on real data" : "No assessments yet";
                }
                if (statAvg) {
                    statAvg.textContent = `${latestRisk}%`;
                    statAvgDelta.textContent = totalAssessments > 0 ? "From latest report" : "--";
                }
                if (statHealth) {
                    statHealth.textContent = `${healthScore}`;
                    statHealthDelta.textContent = totalAssessments > 0 ? "Dynamic score" : "--";
                }
            }

            if (lc || dc || reportsBody) {
                if (totalAssessments > 0) {
                    if (lc) drawLineChart(lc, assessData.map(a => a.risk_score));
                    if (dc) drawDonut(dc, assessData);
                    
                    if (reportsBody) {
                        reportsBody.innerHTML = '';
                        assessData.forEach(assess => {
                            const date = new Date(assess.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            const risk = assess.risk_score;
                            let level = 'Low', badgeCls = 'low';
                            if (risk >= 70) { level = 'High'; badgeCls = 'high'; }
                            else if (risk >= 40) { level = 'Moderate'; badgeCls = 'med'; }
                            
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>${date}</td>
                                <td>${risk}%</td>
                                <td><span class="badge ${badgeCls}">${level}</span></td>
                                <td>${assess.trestbps || '--'}/80</td>
                                <td>${assess.chol || '--'} mg/dL</td>
                                <td>${assess.thalach || '--'} bpm</td>
                            `;
                            reportsBody.appendChild(tr);
                        });
                    }
                } else {
                    if (lc) drawLineChart(lc, [0, 0]);
                    if (dc) drawDonut(dc, []);
                    if (reportsBody) reportsBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No reports found.</td></tr>';
                }
            }
        }
    }

    // Reports search
    const search = document.getElementById('reportSearch');
    if (search) {
      search.addEventListener('input', () => {
        const q = search.value.toLowerCase();
        document.querySelectorAll('#reportsTable tbody tr').forEach(tr => {
          tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      });
    }

    // PDF functionality removed as requested
  });

  function drawLineChart(svg, data) {
    if (data.length < 2) data = [data[0]||0, data[0]||0];
    const w = 600, h = 220, pad = 30;
    const max = 100, min = 0;
    const stepX = (w - pad * 2) / (data.length - 1);
    const points = data.map((v, i) => [pad + i * stepX, h - pad - ((v - min) / (max - min)) * (h - pad * 2)]);
    const path = points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const area = path + ` L ${points[points.length-1][0]},${h-pad} L ${points[0][0]},${h-pad} Z`;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.innerHTML = `
      <defs>
        <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#ff3b53" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#ff3b53" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${[0,1,2,3,4].map(i => {
        const y = pad + i * ((h - pad*2) / 4);
        return `<line x1="${pad}" y1="${y}" x2="${w-pad}" y2="${y}" stroke="rgba(255,255,255,0.05)"/>`;
      }).join('')}
      <path d="${area}" fill="url(#lg)"/>
      <path d="${path}" fill="none" stroke="#ff3b53" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#0a0b10" stroke="#ff3b53" stroke-width="2"/>`).join('')}
    `;
  }

  function drawDonut(svg, data) {
    let low = 0, med = 0, high = 0;
    data.forEach(a => {
        if(a.risk_score >= 70) high++;
        else if (a.risk_score >= 40) med++;
        else low++;
    });
    if (data.length === 0) { low=1; med=0; high=0; }
    
    const segs = [
      { label: 'Low', value: low, color: '#34d399' },
      { label: 'Moderate', value: med, color: '#fbbf24' },
      { label: 'High', value: high, color: '#ef4444' },
    ];
    const cx = 110, cy = 110, r = 80, sw = 22;
    const C = 2 * Math.PI * r;
    let offset = 0;
    const total = segs.reduce((s, x) => s + x.value, 0);
    svg.setAttribute('viewBox', '0 0 320 220');
    const circles = segs.map(s => {
      if(s.value === 0) return '';
      const len = (s.value / total) * C;
      const c = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}"
        stroke-width="${sw}" stroke-dasharray="${len} ${C - len}"
        stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt"/>`;
      offset += len;
      return c;
    }).join('');
    const legend = segs.map((s, i) => `
      <g transform="translate(220, ${60 + i * 28})">
        <rect width="12" height="12" rx="3" fill="${s.color}"/>
        <text x="20" y="10" fill="#e7e9ee" font-size="12" font-family="Inter">${s.label}</text>
        <text x="20" y="24" fill="#6b7180" font-size="11" font-family="Inter">${Math.round((s.value/total)*100)}%</text>
      </g>`).join('');
    svg.innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="${sw}"/>
      ${circles}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="#e7e9ee" font-size="26" font-weight="700" font-family="Inter">${total}</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" fill="#6b7180" font-size="11" font-family="Inter">Total</text>
      ${legend}
    `;
  }
})();