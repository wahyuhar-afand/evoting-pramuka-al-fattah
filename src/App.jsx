import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  getDocs,
  increment,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  Users,
  User,
  LogIn,
  Settings,
  BarChart2,
  PlusCircle,
  Trash2,
  LogOut,
  CheckCircle2,
  ShieldAlert,
  AlertCircle,
  X,
  Upload,
} from 'lucide-react';

// --- 1. Firebase Initialization ---
// Sesuaikan dengan konfigurasi Firebase project Anda
const firebaseConfig = {
  apiKey: "AIzaSyDdOkPQ6EC2CEZvzvpV7xciHwDrTuWAq4o",
  authDomain: "evoting-alfattahscout.firebaseapp.com",
  projectId: "evoting-alfattahscout",
  storageBucket: "evoting-alfattahscout.firebasestorage.app",
  messagingSenderId: "704949344556",
  appId: "1:704949344556:web:cc982d5eb524ece0837489",
  measurementId: "G-KS50VR57XY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Reusable UI Components ---

const Modal = ({ isOpen, onClose, title, children, actions }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-emerald-50">
          <h3 className="font-bold text-emerald-800 flex items-center gap-2">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {actions && (
          <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor =
    type === 'error'
      ? 'bg-red-500'
      : type === 'success'
      ? 'bg-emerald-500'
      : 'bg-blue-500';

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white shadow-lg flex items-center gap-2 z-50 animate-in slide-in-from-top-4 ${bgColor}`}
    >
      {type === 'error' ? (
        <AlertCircle size={20} />
      ) : (
        <CheckCircle2 size={20} />
      )}
      <span className="font-medium text-sm sm:text-base whitespace-nowrap">
        {message}
      </span>
    </div>
  );
};

const Card = ({ children, className = '' }) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}
  >
    {children}
  </div>
);

// --- Main Application Component ---

export default function ScoutEVotingApp() {
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => setToast({ message, type });

  const [currentView, setCurrentView] = useState('home'); // home, voting, admin-login, admin-dashboard
  const [voterSession, setVoterSession] = useState(null); // { id, role, gender }
  const [settings, setSettings] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Seed Initial Data if Database is Empty ---
  const seedDatabaseIfEmpty = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'scout_main'));
      if (!settingsDoc.exists()) {
        console.log('Inisialisasi database Pramuka...');
        await setDoc(doc(db, 'settings', 'scout_main'), {
          startYear: '2026',
          endYear: '2027',
        });

        const defaultCandidates = [
          {
            category: 'Pratama Putra',
            order: 1,
            name: 'Ahmad Fauzi',
            vision: 'Mewujudkan Pramuka yang disiplin dan berprestasi.',
            mission: '1. Mengaktifkan latihan rutin\n2. Meningkatkan kedisiplinan\n3. Lomba antar regu',
            votes: 0,
            photoUrl: '',
          },
          {
            category: 'Pratama Putra',
            order: 2,
            name: 'Rizki Ramadhan',
            vision: 'Pramuka tangguh, terampil, dan berkarakter.',
            mission: '1. Pelatihan kepemimpinan\n2. Bakti sosial\n3. Penguatan SKU',
            votes: 0,
            photoUrl: '',
          },
          {
            category: 'Pratama Putri',
            order: 1,
            name: 'Siti Nurhaliza',
            vision: 'Unggul dalam krida dan santun dalam perilaku.',
            mission: '1. Tertib administrasi\n2. Kreatif dalam hasta karya\n3. Disiplin waktu',
            votes: 0,
            photoUrl: '',
          },
          {
            category: 'Pratama Putri',
            order: 2,
            name: 'Dewi Lestari',
            vision: 'Pramuka aktif, ceria, dan peduli lingkungan.',
            mission: '1. Jumat bersih pangkalan\n2. Pelatihan sandi dan pionering\n3. Kemses (Kemah Semester)',
            votes: 0,
            photoUrl: '',
          },
        ];

        for (const cand of defaultCandidates) {
          await setDoc(doc(collection(db, 'scout_candidates')), {
            ...cand,
            createdAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('Gagal seed data:', err);
    }
  };

  // --- Firebase Listeners ---
  useEffect(() => {
    let unsubSettings, unsubCandidates;
    let isMounted = true;

    const initialize = async () => {
      await seedDatabaseIfEmpty();

      unsubSettings = onSnapshot(
        doc(db, 'settings', 'scout_main'),
        (docSnap) => {
          if (docSnap.exists() && isMounted) {
            setSettings(docSnap.data());
          }
        },
        (error) => console.error('Settings error:', error)
      );

      const q = query(collection(db, 'scout_candidates'), orderBy('order', 'asc'));
      unsubCandidates = onSnapshot(
        q,
        (snapshot) => {
          if (!isMounted) return;
          const cands = [];
          snapshot.forEach((doc) => {
            cands.push({ id: doc.id, ...doc.data() });
          });
          setCandidates(cands);
          setIsLoading(false);
        },
        (error) => console.error('Candidates error:', error)
      );
    };

    initialize();

    return () => {
      isMounted = false;
      if (unsubSettings) unsubSettings();
      if (unsubCandidates) unsubCandidates();
    };
  }, []);

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-emerald-700 bg-gray-50 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
        <div className="font-medium">Menghubungkan ke Sistem E-Voting Pramuka...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans selection:bg-emerald-200">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {currentView === 'home' && (
        <HomeView
          onLogin={(session) => {
            setVoterSession(session);
            setCurrentView('voting');
          }}
          onGoAdmin={() => setCurrentView('admin-login')}
          settings={settings}
          showToast={showToast}
        />
      )}

      {currentView === 'voting' && voterSession && (
        <VotingView
          voter={voterSession}
          candidates={candidates}
          onVoteComplete={() => {
            setVoterSession(null);
            setCurrentView('home');
          }}
          onCancel={() => {
            setVoterSession(null);
            setCurrentView('home');
          }}
          showToast={showToast}
        />
      )}

      {currentView === 'admin-login' && (
        <AdminLoginView
          onSuccess={() => setCurrentView('admin-dashboard')}
          onCancel={() => setCurrentView('home')}
          showToast={showToast}
        />
      )}

      {currentView === 'admin-dashboard' && (
        <AdminDashboard
          settings={settings}
          candidates={candidates}
          onLogout={() => setCurrentView('home')}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ==========================================
// VIEWS
// ==========================================

// --- 1. Home View (Voter Login) ---
function HomeView({ onLogin, onGoAdmin, settings, showToast }) {
  const [voterId, setVoterId] = useState('');
  const [role, setRole] = useState('Anggota');
  const [gender, setGender] = useState('Laki-laki');
  const [isChecking, setIsChecking] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!voterId.trim()) {
      showToast('Masukkan ID Pemilih terlebih dahulu.', 'error');
      return;
    }

    setIsChecking(true);
    try {
      const voterDocRef = doc(db, 'scout_votedIds', voterId.trim());
      const voterSnap = await getDoc(voterDocRef);

      if (voterSnap.exists()) {
        showToast('Maaf, ID Pemilih ini sudah digunakan untuk memilih.', 'error');
        setIsChecking(false);
        return;
      }

      onLogin({ id: voterId.trim(), role, gender });
    } catch (err) {
      console.error(err);
      showToast('Gagal memverifikasi ID. Periksa koneksi internet.', 'error');
    }
    setIsChecking(false);
  };

  return (
    <div className="max-w-2xl mx-auto pt-10 p-6 flex flex-col items-center">
      {/* Logos Section */}
      <div className="flex flex-col items-center gap-4 mb-6 w-full">
        <div className="flex justify-center">
          <img
            src="https://lh3.googleusercontent.com/d/1VcoKqHq9JtcX2HQ30yhBgku8Zn5VRZFL=w1000"
            alt="Logo SMP NU Al Fattah"
            referrerPolicy="no-referrer"
            className="h-28 sm:h-36 w-auto object-contain drop-shadow-md"
          />
        </div>
        <div className="flex gap-8 justify-center items-center mt-2">
          {/* Logo Tunas Kelapa (Pramuka) */}
          <div className="flex flex-col items-center">
            <img
              src="https://lh3.googleusercontent.com/d/1H7ToRKPAKZCnwiUjteSFyCzRYJnYUIrn"
              alt="Logo Pramuka Tunas Kelapa"
              referrerPolicy="no-referrer"
              className="h-16 w-auto object-contain drop-shadow"
            />
            <span className="text-[11px] font-bold text-gray-600 mt-1">Pramuka</span>
          </div>
          {/* Logo WOSM (Pandu Dunia) */}
          <div className="flex flex-col items-center">
            <img
              src="https://lh3.googleusercontent.com/d/1zNLWnrX9uocXtVGr3hpW4NcueqBAvhUf"
              alt="Logo WOSM Pandu Dunia"
              referrerPolicy="no-referrer"
              className="h-16 w-auto object-contain drop-shadow"
            />
            <span className="text-[11px] font-bold text-gray-600 mt-1">WOSM</span>
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-1">
          APLIKASI E-VOTING PRAMUKA
        </h1>
        <h2 className="text-lg font-bold text-emerald-700 mb-1">
          GUGUS DEPAN SMP NU AL FATTAH
        </h2>
        <p className="text-gray-500 font-medium bg-emerald-50 py-1 px-4 rounded-full inline-block text-sm">
          PERIODE TAHUN {settings.startYear} - {settings.endYear}
        </p>
      </div>

      <Card className="w-full p-6 sm:p-8">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              ID Pemilih
            </label>
            <input
              type="text"
              required
              value={voterId}
              onChange={(e) => setVoterId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
              placeholder="Contoh: PRAMUCA-001"
            />
            <p className="text-xs text-gray-500 mt-1">
              *ID memastikan pemilih tidak dapat memilih dua kali.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Role / Jenis Pemilih
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="Anggota">Anggota (Bobot Suara: 1)</option>
                <option value="Dewan Penggalang">Dewan Penggalang (Bobot: 3)</option>
                <option value="Pembina">Pembina (Bobot Suara: 5)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Jenis Kelamin
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="Laki-laki">Laki-laki (Pratama Putra)</option>
                <option value="Perempuan">Perempuan (Pratama Putri)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isChecking}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
          >
            {isChecking ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Memverifikasi...
              </>
            ) : (
              <>
                <LogIn size={20} /> MASUK KE BILIK SUARA
              </>
            )}
          </button>
        </form>
      </Card>

      <button
        onClick={onGoAdmin}
        className="mt-6 text-sm text-gray-400 hover:text-emerald-600 transition-colors flex items-center gap-1 font-medium"
      >
        <Settings size={14} /> Login Admin Panel
      </button>
    </div>
  );
}

// --- 2. Voting View ---
function VotingView({
  voter,
  candidates,
  onVoteComplete,
  onCancel,
  showToast,
}) {
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Filter candidates based on gender
  const targetCategory = voter.gender === 'Laki-laki' ? 'Pratama Putra' : 'Pratama Putri';
  const availableCandidates = candidates.filter((c) => c.category === targetCategory);

  const getVoteWeight = (role) => {
    if (role === 'Pembina') return 5;
    if (role === 'Dewan Penggalang') return 3;
    return 1;
  };

  const handleVoteSubmit = async () => {
    setIsVoting(true);
    try {
      const weight = getVoteWeight(voter.role);
      const batch = writeBatch(db);

      // 1. Mark voter ID as used
      const voterRef = doc(db, 'scout_votedIds', voter.id);
      batch.set(voterRef, {
        votedAt: new Date().toISOString(),
        role: voter.role,
        gender: voter.gender,
        weight: weight,
      });

      // 2. Increment votes for selected candidate
      const candRef = doc(db, 'scout_candidates', selectedCandidateId);
      batch.update(candRef, {
        votes: increment(weight),
      });

      await batch.commit();

      showToast('Suara berhasil dikirim! Terima kasih.', 'success');
      onVoteComplete();
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan saat mengirim suara.', 'error');
    }
    setIsVoting(false);
    setShowConfirmModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto pt-6 p-4 pb-28">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <p className="text-sm text-gray-500">
            ID Pemilih: <span className="font-bold text-gray-800">{voter.id}</span>
          </p>
          <p className="text-sm text-gray-500">
            Role & Bobot:{' '}
            <span className="font-bold text-emerald-600">
              {voter.role} (Bobot Suara: {getVoteWeight(voter.role)})
            </span>
          </p>
          <p className="text-sm text-gray-500">
            Kategori Pemilihan:{' '}
            <span className="font-bold text-emerald-700">{targetCategory}</span>
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1 border border-red-100 bg-red-50 px-3 py-1.5 rounded-lg"
        >
          <X size={16} /> Batal & Keluar
        </button>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Pilih Calon {targetCategory}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Klik salah satu kandidat di bawah ini untuk memberikan suara Anda.
        </p>
        <div className="w-16 h-1 bg-emerald-500 mx-auto mt-2 rounded-full"></div>
      </div>

      {availableCandidates.length === 0 ? (
        <div className="bg-white p-12 rounded-xl text-center text-gray-400 border">
          Belum ada kandidat terdaftar untuk kategori {targetCategory}.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableCandidates.map((candidate) => {
            const isSelected = selectedCandidateId === candidate.id;
            return (
              <div
                key={candidate.id}
                onClick={() => setSelectedCandidateId(candidate.id)}
                className={`relative cursor-pointer transition-all duration-200 rounded-xl border-2 overflow-hidden bg-white shadow-sm hover:shadow-md flex flex-col justify-between
                  ${
                    isSelected
                      ? 'border-emerald-500 ring-4 ring-emerald-100 scale-[1.02]'
                      : 'border-gray-200 hover:border-emerald-300'
                  }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1 rounded-full z-10 shadow">
                    <CheckCircle2 size={20} />
                  </div>
                )}
                <div>
                  <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden relative">
                    {candidate.photoUrl ? (
                      <img
                        src={candidate.photoUrl}
                        alt={candidate.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={48} className="text-gray-300" />
                    )}
                    <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded font-bold">
                      No. Urut: {candidate.order}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-800 text-center mb-3">
                      {candidate.name}
                    </h3>
                    <div className="space-y-2 text-sm border-t pt-3">
                      <div>
                        <span className="font-semibold text-emerald-700 block text-xs mb-0.5">
                          VISI:
                        </span>
                        <p className="text-gray-600 text-xs italic">
                          "{candidate.vision}"
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-emerald-700 block text-xs mb-0.5">
                          MISI:
                        </span>
                        <ol className="list-decimal list-inside space-y-0.5 text-gray-600 text-xs">
                          {candidate.mission &&
                            candidate.mission.split('\n').map((item, index) => (
                              item.trim() && <li key={index}>{item.trim()}</li>
                            ))}
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`py-3 text-center font-bold text-sm transition-colors ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  {isSelected ? 'TERPILIH' : 'PILIH KANDIDAT INI'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating VOTE Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg flex justify-center z-40">
        <div className="max-w-xl w-full flex items-center justify-between gap-4">
          <p className="text-xs text-gray-500 hidden sm:block">
            Pastikan pilihan sudah sesuai sebelum mengirim suara.
          </p>
          <button
            onClick={() =>
              selectedCandidateId
                ? setShowConfirmModal(true)
                : showToast('Pilih salah satu kandidat terlebih dahulu.', 'error')
            }
            className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white shadow transition-all flex items-center justify-center gap-2
              ${
                selectedCandidateId
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
          >
            <CheckCircle2 size={20} />
            KIRIM SUARA (VOTE)
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => !isVoting && setShowConfirmModal(false)}
        title="Konfirmasi Pilihan Suara"
        actions={
          <>
            <button
              disabled={isVoting}
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
            >
              Batal
            </button>
            <button
              disabled={isVoting}
              onClick={handleVoteSubmit}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow hover:bg-emerald-700 flex items-center justify-center gap-2"
            >
              {isVoting ? 'Mengirim...' : 'Ya, Kirim Suara'}
            </button>
          </>
        }
      >
        <p className="text-gray-700 mb-4 text-sm">
          Apakah Anda yakin ingin memilih kandidat ini? Pilihan{' '}
          <strong className="text-red-500">tidak dapat diubah</strong> setelah dikirim.
        </p>
        <div className="bg-emerald-50 p-3 rounded-lg text-sm border border-emerald-100">
          <p className="text-gray-600">Kandidat Terpilih:</p>
          <p className="font-bold text-emerald-900 text-base">
            {availableCandidates.find((c) => c.id === selectedCandidateId)?.name}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Bobot Suara Anda: {getVoteWeight(voter.role)} Poin
          </p>
        </div>
      </Modal>
    </div>
  );
}

// --- 3. Admin Login View ---
function AdminLoginView({ onSuccess, onCancel, showToast }) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === 'alfattahscout') {
      onSuccess();
    } else {
      showToast('Password admin salah!', 'error');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
            <ShieldAlert size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Login Admin Pramuka
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Password Admin
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Masukkan password admin"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors"
            >
              Masuk
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// --- 4. Admin Dashboard ---
function AdminDashboard({ settings, candidates, onLogout, showToast }) {
  const [activeTab, setActiveTab] = useState('results'); // results, candidates, settings
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const base64String = canvas.toDataURL('image/jpeg', 0.75);
        setNewCand({ ...newCand, photoUrl: base64String });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const [newCand, setNewCand] = useState({
    category: 'Pratama Putra',
    order: 1,
    name: '',
    photoUrl: '',
    vision: '',
    mission: '',
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setIsUpdatingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'scout_main'), {
        startYear: formData.get('startYear'),
        endYear: formData.get('endYear'),
      });
      showToast('Periode berhasil diperbarui!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal memperbarui periode.', 'error');
    }
    setIsUpdatingSettings(false);
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!newCand.name || !newCand.vision || !newCand.mission) {
      showToast('Harap isi semua kolom wajib.', 'error');
      return;
    }
    setIsAdding(true);
    try {
      await setDoc(doc(collection(db, 'scout_candidates')), {
        ...newCand,
        votes: 0,
        createdAt: new Date().toISOString(),
      });
      setNewCand({
        category: 'Pratama Putra',
        order: 1,
        name: '',
        photoUrl: '',
        vision: '',
        mission: '',
      });
      showToast('Kandidat berhasil ditambahkan.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal menambahkan kandidat.', 'error');
    }
    setIsAdding(false);
  };

  const handleDeleteCandidate = async (id) => {
    try {
      await deleteDoc(doc(db, 'scout_candidates', id));
      showToast('Kandidat dihapus.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus.', 'error');
    }
  };

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      const votersSnap = await getDocs(collection(db, 'scout_votedIds'));
      let batch = writeBatch(db);
      let count = 0;

      votersSnap.docs.forEach((d) => {
        batch.delete(doc(db, 'scout_votedIds', d.id));
        count++;
        if (count % 400 === 0) {
          batch.commit();
          batch = writeBatch(db);
        }
      });
      await batch.commit();

      batch = writeBatch(db);
      candidates.forEach((c) => {
        batch.update(doc(db, 'scout_candidates', c.id), { votes: 0 });
      });
      await batch.commit();

      showToast('Data berhasil di-reset bersih untuk periode baru!', 'success');
      setShowResetModal(false);
    } catch (err) {
      console.error(err);
      showToast('Gagal mereset data.', 'error');
    }
    setIsResetting(false);
  };

  const renderResults = () => {
    const categories = ['Pratama Putra', 'Pratama Putri'];

    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              Rekapitulasi Suara Pramuka (Real-time)
            </h3>
            <p className="text-xs text-gray-500">
              *Jumlah poin memperhitungkan bobot suara (Anggota: 1, Penggalang: 3, Pembina: 5).
            </p>
          </div>
          <button
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-2 text-sm text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-medium shadow transition-colors"
          >
            <Trash2 size={16} /> Reset Seluruh Suara & ID
          </button>
        </div>

        {categories.map((cat) => {
          const catCandidates = candidates
            .filter((c) => c.category === cat)
            .sort((a, b) => b.votes - a.votes);
          const totalVotes = catCandidates.reduce(
            (sum, c) => sum + (c.votes || 0),
            0
          );

          return (
            <Card key={cat} className="p-6">
              <h4 className="font-bold text-lg mb-4 text-emerald-800 border-b pb-2">
                Kategori: {cat} (Total Poin: {totalVotes})
              </h4>
              {catCandidates.length === 0 ? (
                <p className="text-gray-400 italic text-sm">
                  Belum ada kandidat
                </p>
              ) : (
                <div className="space-y-4">
                  {catCandidates.map((c) => {
                    const percentage =
                      totalVotes === 0
                        ? 0
                        : Math.round((c.votes / totalVotes) * 100);
                    return (
                      <div key={c.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-semibold text-gray-700">
                            {c.order}. {c.name}
                          </span>
                          <span className="font-bold text-emerald-600">
                            {c.votes || 0} Poin ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-emerald-500 h-2.5 rounded-full transition-all duration-1000"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  const renderManageCandidates = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card className="p-6 sticky top-20">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <PlusCircle size={20} className="text-emerald-500" /> Tambah Kandidat
          </h3>
          <form onSubmit={handleAddCandidate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Kategori Pramuka
              </label>
              <select
                value={newCand.category}
                onChange={(e) =>
                  setNewCand({ ...newCand, category: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md text-sm outline-none bg-white"
              >
                <option value="Pratama Putra">Pratama Putra</option>
                <option value="Pratama Putri">Pratama Putri</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Nomor Urut
              </label>
              <input
                type="number"
                min={1}
                required
                value={newCand.order}
                onChange={(e) =>
                  setNewCand({ ...newCand, order: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 border rounded-md text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Nama Lengkap Kandidat
              </label>
              <input
                type="text"
                required
                value={newCand.name}
                onChange={(e) =>
                  setNewCand({ ...newCand, name: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Foto Kandidat
              </label>
              {newCand.photoUrl ? (
                <div className="relative w-24 h-32 bg-gray-100 rounded-lg overflow-hidden border">
                  <img
                    src={newCand.photoUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setNewCand({ ...newCand, photoUrl: '' })}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <Upload className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500 font-semibold">
                    Pilih Foto
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Visi
              </label>
              <textarea
                required
                rows={2}
                value={newCand.vision}
                onChange={(e) =>
                  setNewCand({ ...newCand, vision: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md text-sm outline-none"
              ></textarea>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Misi (Tekan Enter untuk baris baru / poin)
              </label>
              <textarea
                required
                rows={3}
                value={newCand.mission}
                onChange={(e) =>
                  setNewCand({ ...newCand, mission: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md text-sm outline-none"
                placeholder="1. Poin pertama&#10;2. Poin kedua"
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={isAdding}
              className="w-full bg-emerald-600 text-white font-bold py-2 rounded-md hover:bg-emerald-700 text-sm flex justify-center items-center gap-2"
            >
              {isAdding ? 'Menyimpan...' : 'Simpan Kandidat'}
            </button>
          </form>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <h3 className="font-bold text-lg mb-2">Daftar Kandidat Terdaftar</h3>
        {candidates.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border text-center text-gray-500">
            Belum ada kandidat terdaftar.
          </div>
        ) : (
          candidates.map((c) => (
            <Card key={c.id} className="p-4 flex gap-4 items-start">
              <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                {c.photoUrl ? (
                  <img
                    src={c.photoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-full h-full p-3 text-gray-300" />
                )}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {c.category} (No. {c.order})
                    </span>
                    <h4 className="font-bold text-gray-800 mt-1">{c.name}</h4>
                  </div>
                  <button
                    onClick={() => handleDeleteCandidate(c.id)}
                    className="text-gray-400 hover:text-red-500 p-1.5 bg-gray-50 rounded hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  <p>
                    <span className="font-semibold">Visi:</span> {c.vision}
                  </p>
                  <div>
                    <span className="font-semibold">Misi:</span>
                    <ul className="list-disc list-inside">
                      {c.mission &&
                        c.mission.split('\n').map((item, i) => (
                          item.trim() && <li key={i}>{item.trim()}</li>
                        ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <Card className="p-6 max-w-lg">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Settings size={20} className="text-emerald-500" /> Pengaturan Periode Pramuka
      </h3>
      <form onSubmit={handleUpdateSettings} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Tahun Mulai
            </label>
            <input
              type="number"
              required
              name="startYear"
              defaultValue={settings?.startYear || '2026'}
              className="w-full px-4 py-2 border rounded-lg outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Tahun Selesai
            </label>
            <input
              type="number"
              required
              name="endYear"
              defaultValue={settings?.endYear || '2027'}
              className="w-full px-4 py-2 border rounded-lg outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          className="bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg shadow hover:bg-emerald-700"
        >
          Simpan Periode
        </button>
      </form>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-gray-800">
            <div className="bg-emerald-600 text-white p-1.5 rounded-md">
              <ShieldAlert size={18} />
            </div>
            Admin Panel E-Voting Pramuka
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 font-medium bg-gray-100 px-3 py-1.5 rounded-lg"
          >
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8">
        <div className="flex space-x-2 mb-8 bg-white p-1.5 rounded-xl shadow-sm border w-fit">
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              activeTab === 'results' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500'
            }`}
          >
            <BarChart2 size={16} /> Rekap Suara
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              activeTab === 'candidates' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500'
            }`}
          >
            <Users size={16} /> Kelola Kandidat
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              activeTab === 'settings' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500'
            }`}
          >
            <Settings size={16} /> Pengaturan
          </button>
        </div>

        <div>
          {activeTab === 'results' && renderResults()}
          {activeTab === 'candidates' && renderManageCandidates()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </main>

      {/* Reset Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => !isResetting && setShowResetModal(false)}
        title="Konfirmasi Reset Data Pemilihan"
        actions={
          <>
            <button
              disabled={isResetting}
              onClick={() => setShowResetModal(false)}
              className="px-4 py-2 text-gray-600 rounded-lg font-medium"
            >
              Batal
            </button>
            <button
              disabled={isResetting}
              onClick={handleResetData}
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
            >
              {isResetting ? 'Mereset...' : 'Ya, Reset Bersih'}
            </button>
          </>
        }
      >
        <p className="text-gray-700 mb-2 text-sm">
          Apakah Anda yakin ingin mereset seluruh data pemilihan Pramuka ini?
        </p>
        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 mb-4">
          <li>Semua riwayat ID Pemilih yang sudah masuk akan dihapus.</li>
          <li>Perolehan poin seluruh kandidat dikembalikan menjadi 0.</li>
        </ul>
        <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
          Cocok digunakan untuk uji coba sistem atau pergantian periode tahun baru.
        </p>
      </Modal>
    </div>
  );
}
