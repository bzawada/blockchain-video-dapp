import React, { Component } from 'react';
import DVideo from '../abis/DVideo.json'
import Navbar from './Navbar'
import Main from './Main'
import Web3 from 'web3';
import './App.css';

//Declare IPFS
const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' })

class App extends Component {

  async componentDidMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  }

  async loadBlockchainData() {
    const web3 = window.web3
    const accounts = await web3.eth.getAccounts()
    this.setState({ account: accounts[0] })

    const networkId = await web3.eth.net.getId()
    const networkData = DVideo.networks[networkId]
    if (networkData) {
      const dvideo = new web3.eth.Contract(DVideo.abi, networkData.address)
      this.setState({ dvideo })
      const videosCount = await dvideo.methods.videoCount().call()
      this.setState({ videosCount })

      for(let i = videosCount; i>= 1; i--) {
        const video = await dvideo.methods.videos(i).call()
        this.setState({ videos: [...this.state.videos, video]})
      }

      const latest = await dvideo.methods.videos(videosCount).call()
      this.setState({
        currentHash: latest.hash,
        currentTitle: latest.title
      })
      this.setState({ loading: false })
    } else {
      window.alert('DVideo contract not deployed to detected network')
    }
  }

  captureFile = event => {
    event.preventDefault()
    const file = event.target.files[0]
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(file)

    reader.onloadend = () => {
      this.setState({ buffer: Buffer(reader.result) })
    }
  }

  uploadVideo = title => {
    this.setState({ loading: true })
    ipfs.add(this.state.buffer, (error, result) => {
      if (error) {
        console.error(error)
        return
      }
      this.state.dvideo.methods
        .uploadVideo(result[0].hash, title)
        .send({ from: this.state.account})
        .on('transactionHash', () => {
          this.setState({ loading: false})
        })
    })
  }

  changeVideo = (hash, title) => {
    this.setState({ currentHash: hash, currentTitle: title})
  }

  constructor(props) {
    super(props)
    this.state = {
      loading: false,
      account: '',
      dvideo: null,
      videos: [],
      videosCount: 0,
      currentHash: '',
      currentTitle: ''
    }
  }

  render() {
    return (
      <div>
        <Navbar
            account={this.state.account}
        />
        { this.state.loading
          ? <div id="loader" className="text-center mt-5"><p>Loading...</p></div>
          : <Main
              captureFile={this.captureFile}
              uploadVideo={this.uploadVideo}
              currentHash={this.state.currentHash}
              currentTitle={this.state.currentTitle}
              videos={this.state.videos}
              changeVideo={this.changeVideo}
            />
        }
      </div>
    );
  }
}

export default App;
