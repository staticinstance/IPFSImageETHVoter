import React, { Component } from 'react';
import Web3 from 'web3';
import './App.css';
import IPFSImageVoter from './abis/IPFSImageVoter.json'
import Navbar from './components/Navbar'
import Main from './components/Main'

//Declare IPFS
const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' }) // leaving out the arguments will default to these values

class App extends Component {

  async componentWillMount(){
    await this.loadWeb3();
  }

  async loadWeb3() {
    if(window.ethereum){
      window.web3 = new Web3(window.ethereum);
      await window.ethereum.enable();
    } else if(window.web3){
      window.web3 = new Web3(window.web3.currentProvider)
    } else {
      window.alert('You are a no coiner! Please connect a wallet or GTFO!');
      return;
    }
    await this.loadBlockchainData();
  }

  async loadBlockchainData(){
    this.setState({loading: true})
    const web3 = window.web3;

    const accounts = await web3.eth.getAccounts();
    this.setState({account: accounts[0]});

    const networkId = await web3.eth.net.getId();
    const networkData = IPFSImageVoter.networks[networkId];
    if(networkData){
      const IPFSImageVoterContract = web3.eth.Contract(IPFSImageVoter.abi, networkData.address)
      this.setState({IPFSImageVoterContract});
      const imageCount = await IPFSImageVoterContract.methods.imageCount().call();
      this.setState({imageCount, loading: false});
      // Load images
      for (var i = 1; i <= imageCount; i++) {
        const image = await IPFSImageVoterContract.methods.images(i).call()
        this.setState({
          images: [...this.state.images, image]
        })
      }
      // Sort images. Show highest tipped images first
      this.setState({
        images: this.state.images.sort((a,b) => b.tipAmount - a.tipAmount )
      })



      // IPFSImageVoterContract.events.allEvents()
      // .on('data', (event) => {
      //   console.log(event);
      //   this.loadBlockchainData();
      // })
      // .on('error', console.error);


this.setState({ loading: false}, ()=>this.forceUpdate());
console.log('subscribed')
    } else {
      window.alert('IPFSImageVoter contract not deployed to detected network.')
    }
    
  }

  captureFile = event => {

    event.preventDefault()
    const file = event.target.files[0]
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(file)

    reader.onloadend = () => {
      this.setState({ buffer: Buffer(reader.result) })
      console.log('buffer', this.state.buffer)
    }
  }

  uploadImage = description => {
    console.log("Submitting file to ipfs...")

    //adding file to the IPFS
    ipfs.add(this.state.buffer, (error, result) => {
      console.log('Ipfs result', result)
      if(error) {
        console.error(error)
        return
      }

      this.setState({ loading: true })
      this.state.IPFSImageVoterContract.methods.uploadImage(result[0].hash, description).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.setState({ loading: false })
      })
    })
  }

  tipImageOwner(id, tipAmount) {
    this.setState({ loading: true })
    this.state.IPFSImageVoterContract.methods.tipImageOwner(id).send({ from: this.state.account, value: tipAmount }).on('transactionHash', (hash) => {
      this.setState({ loading: false })
      setTimeout(()=>{
        this.loadBlockchainData();
        this.forceUpdate();
      }, 1000);
    })
  }

  constructor(props) {
    super(props)

    this.state = {
      account: '',
      IPFSImageVoterContract: null,
      images: [],
      loading: true,
      imagesCount: 0,
    }

    this.uploadImage = this.uploadImage.bind(this)
    this.tipImageOwner = this.tipImageOwner.bind(this)
    this.captureFile = this.captureFile.bind(this)
  }

  render() {
    return (
      <div>
        <Navbar account={this.state.account} />
        { this.state.loading
          ? <div id="loader" className="text-center mt-5"><p>Loading...</p></div>
          : <Main
              imageCount={this.state.imageCount}
              images={this.state.images}
              captureFile={this.captureFile}
              uploadImage={this.uploadImage}
              tipImageOwner={this.tipImageOwner}
            />
        }
      </div>
    );
  }
}

export default App;