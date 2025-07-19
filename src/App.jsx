// App.jsx - The Final, Real-time Version

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import Irys from '@irys/sdk';

// ✅ FIREBASE: Import Firestore functions
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, onSnapshot, serverTimestamp } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";


import './App.css'; 

import backgroundImage from './assets/background.png';

// --- ✅ FIREBASE: Configuration ---
// This configuration is provided by the environment.
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : { apiKey: "DEMO_KEY", authDomain: "DEMO.firebaseapp.com", projectId: "DEMO_PROJECT" };

const appId = typeof __app_id !== 'undefined' ? __app_id : 'irys-meme-wall-default';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


// --- Reusable Result/Success Modal ---
const ResultModal = ({ title, message, txId, url, closeModal }) => (
  <div className="modal-overlay" onClick={closeModal}>
    <div className="result-modal-content" onClick={(e) => e.stopPropagation()}>
      <h2 style={{ color: title === 'Success' ? '#28a745' : '#dc3545' }}>{title}</h2>
      <p>{message}</p>
      {txId && <p><strong>Transaction ID:</strong> <span className="font-mono text-sm">{txId}</span></p>}
      {url && <p><strong>URL:</strong> <a href={url} target="_blank" rel="noopener noreferrer">{url}</a></p>}
      <button className="action-button mt-4" onClick={closeModal}>Close</button>
    </div>
  </div>
);

// --- Uploader Component ---
const Uploader = ({ isMemeUploader, setPage, showResultModal, userId }) => {
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [irysInstance, setIrysInstance] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Connect wallet to begin.');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelection = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      showResultModal('Error', 'MetaMask is not installed.');
      return;
    }
    try {
      setIsLoading(true);
      setStatusMessage('Connecting to MetaMask...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const irys = new Irys({ network: "mainnet", token: "matic", wallet: { provider, name: "ethersv5" } });
      await irys.ready();
      setIrysInstance(irys);
      setStatusMessage('Wallet connected. You can now upload.');
      setIsLoading(false);
    } catch (err) {
      showResultModal('Error', `Failed to connect: ${err.message || err}`);
      setStatusMessage('Connection failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      showResultModal('Error', 'Please select at least one file.');
      return;
    }
    if (isMemeUploader && !title) {
      showResultModal('Error', 'Please enter a title for your meme.');
      return;
    }
    setIsLoading(true);
    try {
      setStatusMessage(`Uploading to Irys...`);
      const file = files[0]; // For memes, we only upload one
      const tags = [{ name: 'Content-Type', value: file.type }, { name: 'App-Name', value: 'Irys-Meme-Wall-Firestore' }];
      const receipt = await irysInstance.uploadFile(file, { tags });
      
      setStatusMessage(`Saving to the Meme Wall...`);

      const memesCollectionRef = collection(db, `artifacts/${appId}/public/data/memes`);
      await addDoc(memesCollectionRef, {
        irysId: receipt.id,
        title: title,
        uploader: userId,
        createdAt: serverTimestamp()
      });

      showResultModal('Success', 'Your meme is now live on the wall!', receipt.id, `https://gateway.irys.xyz/${receipt.id}`);
      setPage('meme-wall');

    } catch (e) {
      showResultModal('Error', `Upload failed: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="wall-header"><button className="action-button" onClick={() => setPage('home')} disabled={isLoading}>← Back</button></div>
      <div className="uploader-box">
        <h2>{isMemeUploader ? 'Upload Your MEME' : 'Upload Files'}</h2>
        <label htmlFor="file-input" className="file-input-label">Choose File(s)</label>
        <input id="file-input" type="file" className="hidden" multiple={!isMemeUploader} onChange={handleFileSelection} />
        {files.length > 0 && (<div className="text-left mt-4 p-2 bg-gray-100 rounded"><p className="font-semibold">Selected:</p><ul className="list-disc list-inside text-sm">{files.map((file, i) => <li key={i}>{file.name}</li>)}</ul></div>)}
        {isMemeUploader && (<input type="text" placeholder="Enter meme title..." value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md my-4" />)}
        <div className="mt-6">{!irysInstance ? (<button onClick={connectWallet} disabled={isLoading} className="action-button w-full">{isLoading ? 'Connecting...' : 'Connect Wallet'}</button>) : (<button onClick={handleUpload} disabled={isLoading || files.length === 0} className="action-button secondary-button w-full">{isLoading ? 'Uploading...' : 'Upload Now'}</button>)}</div>
        <p className="mt-4 text-gray-600">{statusMessage}</p>
      </div>
    </div>
  );
};

// --- Skeleton Loader ---
const SkeletonCard = () => (<div className="skeleton-card"><div className="skeleton-image"></div><div className="p-4"><div className="skeleton-text"></div></div></div>);

// --- Meme Wall Page ---
const MemeWallPage = ({ setPage, memes, isLoading, viewMeme }) => {
  return (
    <div className="page meme-wall-page">
      <div className="wall-header">
        <button className="action-button" onClick={() => setPage('home')}>← Back</button>
        <h1 className="wall-title">🔥 MEME Wall 🔥</h1>
        <div></div> {/* Spacer */}
      </div>
      <div className="meme-grid">
        {isLoading && memes.length === 0 ? (Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)) : (memes.length > 0 ? memes.map(meme => (
          <div key={meme.id} className="meme-card" onClick={() => viewMeme(meme)}>
            <img src={`https://gateway.irys.xyz/${meme.irysId}`} alt={meme.title} className="meme-image" onError={(e) => e.target.src = 'https://placehold.co/320x300/252525/fff?text=Error'} />
            <div className="meme-card-content"><h3 className="meme-title">{meme.title}</h3></div>
          </div>
        )) : <p className="col-span-full text-xl text-white">No memes found. Be the first to upload one!</p>)}
      </div>
    </div>
  );
};

// --- Meme Viewer Page ---
const MemeViewerPage = ({ setPage, meme }) => {
  if (!meme) return null;
  const gatewayUrl = `https://gateway.irys.xyz/${meme.irysId}`;
  const explorerUrl = `https://viewblock.io/arweave/tx/${meme.irysId}`;
  return (
    <div className="page"><div className="wall-header"><button className="action-button" onClick={() => setPage('meme-wall')}>← Back to Wall</button></div><div className="w-full max-w-4xl mt-16"><h1 className="main-title text-4xl mb-4">{meme.title}</h1><img src={gatewayUrl} alt={meme.title} className="w-full rounded-lg shadow-2xl border-4 border-white" /><p className="meme-owner mt-4 text-lg">Uploaded by: {meme.uploader.substring(0, 8)}...</p><div className="flex justify-center gap-4 mt-6"><a href={gatewayUrl} target="_blank" rel="noopener noreferrer" className="action-button">View Original</a><a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="action-button secondary-button">View on Explorer</a></div></div></div>
  );
};

// --- Home Page ---
const HomePage = ({ setPage }) => (
  <div className="page"><h1 className="main-title">Irys MEME Central</h1><p className="subtitle">Upload, view, and share memes permanently on the decentralized cloud.</p><div className="button-group"><button className="action-button" onClick={() => setPage('upload-file')}>File Upload to Irys</button><button className="action-button secondary-button" onClick={() => setPage('upload-meme')}>Upload Your MEME</button><button className="action-button" onClick={() => setPage('meme-wall')}>View MEME Wall</button></div></div>
);

// --- Main App Component ---
function App() {
  const [page, setPage] = useState('home');
  const [resultModalInfo, setResultModalInfo] = useState(null);
  const [selectedMeme, setSelectedMeme] = useState(null);
  const [memes, setMemes] = useState([]);
  const [isLoadingMemes, setIsLoadingMemes] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        signInAnonymously(auth).catch(error => console.error("Anonymous sign-in failed:", error));
      }
    });

    const memesCollectionRef = collection(db, `artifacts/${appId}/public/data/memes`);
    const q = query(memesCollectionRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const memesData = [];
      querySnapshot.forEach((doc) => {
        memesData.push({ id: doc.id, ...doc.data() });
      });
      memesData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setMemes(memesData);
      setIsLoadingMemes(false);
    }, (error) => {
      console.error("Error fetching memes:", error);
      setIsLoadingMemes(false);
    });

    return () => unsubscribe();
  }, []);


  const showResultModal = (title, message, txId = null, url = null) => {
    setResultModalInfo({ title, message, txId, url });
  };
  
  const viewMeme = (meme) => {
    setSelectedMeme(meme);
    setPage('meme-viewer');
  };

  const renderPage = () => {
    switch (page) {
      case 'upload-file': return <Uploader isMemeUploader={false} setPage={setPage} showResultModal={showResultModal} userId={userId} />;
      case 'upload-meme': return <Uploader isMemeUploader={true} setPage={setPage} showResultModal={showResultModal} userId={userId} />;
      case 'meme-wall': return <MemeWallPage setPage={setPage} memes={memes} isLoading={isLoadingMemes} viewMeme={viewMeme} />;
      case 'meme-viewer': return <MemeViewerPage setPage={setPage} meme={selectedMeme} />;
      default: return <HomePage setPage={setPage} />;
    }
  };

  return (
    <div className="app-container" style={{ backgroundImage: `url(${backgroundImage})` }}>
      {renderPage()}
      {resultModalInfo && <ResultModal {...resultModalInfo} closeModal={() => setResultModalInfo(null)} />}
    </div>
  );
}

export default App;
