// App.jsx - The Final, Reliable Hybrid Version

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import Irys from '@irys/sdk';
import './App.css'; 

import backgroundImage from './assets/background.png';

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
const Uploader = ({ isMemeUploader, setPage, showResultModal, addNewMeme }) => {
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [irysInstance, setIrysInstance] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Connect wallet to begin.');
  const [isLoading, setIsLoading] = useState(false);
  const [signerAddress, setSignerAddress] = useState('');

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
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setSignerAddress(address);
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
      const file = files[0];
      const tags = [{ name: 'Content-Type', value: file.type }, { name: 'App-Name', value: 'Irys-Meme-Wall-Final' }];
      if (isMemeUploader) {
        tags.push({ name: 'Title', value: title });
      }
      const receipt = await irysInstance.uploadFile(file, { tags });
      
      if (isMemeUploader) {
        addNewMeme({ id: receipt.id, title, owner: signerAddress });
      }

      showResultModal('Success', 'Your upload is permanent!', receipt.id, `https://gateway.irys.xyz/${receipt.id}`);
      setPage(isMemeUploader ? 'meme-wall' : 'home');

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
const MemeWallPage = ({ setPage, memes, isLoading, fetchMemes, viewMeme }) => {
  useEffect(() => {
    fetchMemes();
  }, [fetchMemes]);

  return (
    <div className="page meme-wall-page">
      <div className="wall-header">
        <button className="action-button" onClick={() => setPage('home')}>← Back</button>
        <h1 className="wall-title">🔥 MEME Wall 🔥</h1>
        <button className="action-button secondary-button" onClick={fetchMemes}>Refresh</button>
      </div>
      <div className="meme-grid">
        {isLoading && memes.length === 0 ? (Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)) : (memes.length > 0 ? memes.map(meme => (
          <div key={meme.id} className="meme-card" onClick={() => viewMeme(meme)}>
            <img src={`https://gateway.irys.xyz/${meme.id}`} alt={meme.title} className="meme-image" onError={(e) => e.target.src = 'https://placehold.co/320x300/252525/fff?text=Error'} />
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
  const gatewayUrl = `https://gateway.irys.xyz/${meme.id}`;
  const explorerUrl = `https://viewblock.io/arweave/tx/${meme.id}`;
  return (
    <div className="page"><div className="wall-header"><button className="action-button" onClick={() => setPage('meme-wall')}>← Back to Wall</button></div><div className="w-full max-w-4xl mt-16"><h1 className="main-title text-4xl mb-4">{meme.title}</h1><img src={gatewayUrl} alt={meme.title} className="w-full rounded-lg shadow-2xl border-4 border-white" /><p className="meme-owner mt-4 text-lg">Uploaded by: {meme.owner.substring(0,8)}...</p><div className="flex justify-center gap-4 mt-6"><a href={gatewayUrl} target="_blank" rel="noopener noreferrer" className="action-button">View Original</a><a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="action-button secondary-button">View on Explorer</a></div></div></div>
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
  
  const [memes, setMemes] = useState(() => {
    try {
      const localMemes = localStorage.getItem('irys-memes-hybrid');
      return localMemes ? JSON.parse(localMemes) : [];
    } catch (error) { return []; }
  });
  
  const [isLoadingMemes, setIsLoadingMemes] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem('irys-memes-hybrid', JSON.stringify(memes));
    } catch (error) { console.error("Could not save memes", error); }
  }, [memes]);

  const addNewMeme = (newMeme) => {
    setMemes(prevMemes => {
      if (prevMemes.some(meme => meme.id === newMeme.id)) return prevMemes;
      return [newMeme, ...prevMemes];
    });
  };

  const fetchMemes = useCallback(async () => {
    setIsLoadingMemes(true);
    const query = `query { transactions(tags: [{ name: "App-Name", values: ["Irys-Meme-Wall-Final"] }], first: 100, sort: HEIGHT_DESC) { edges { node { id, owner { address }, tags { name, value } } } } }`;
    try {
      const res = await fetch('https://node2.irys.xyz/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
      const json = await res.json();
      const networkMemes = json.data.transactions.edges.map(({ node }) => ({ id: node.id, title: node.tags.find(tag => tag.name === 'Title')?.value || 'Untitled', owner: node.owner.address }));
      
      setMemes(prevLocalMemes => {
        const allMemes = [...prevLocalMemes, ...networkMemes];
        const uniqueMemes = allMemes.filter((meme, index, self) => index === self.findIndex((m) => m.id === meme.id));
        return uniqueMemes.sort((a, b) => b.id.localeCompare(a.id)); // Sort to have a consistent order
      });

    } catch (error) {
      console.error("Failed to fetch memes:", error);
    } finally {
      setIsLoadingMemes(false);
    }
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
      case 'upload-file': return <Uploader isMemeUploader={false} setPage={setPage} showResultModal={showResultModal} addNewMeme={() => {}} />;
      case 'upload-meme': return <Uploader isMemeUploader={true} setPage={setPage} showResultModal={showResultModal} addNewMeme={addNewMeme} />;
      case 'meme-wall': return <MemeWallPage setPage={setPage} memes={memes} isLoading={isLoadingMemes} fetchMemes={fetchMemes} viewMeme={viewMeme} />;
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
