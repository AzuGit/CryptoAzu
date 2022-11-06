import React, { children, useEffect, useState } from "react"
import { ethers } from "ethers"

import { contractABI, contractAddress } from "../utils/constants"

export const TransactionsContext = React.createContext();

const { ethereum } = window;

const getEthereumContract = () => {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const transactionContract = new ethers.Contract(contractAddress, contractABI, signer);

    return transactionContract;

}

// Provider to use in context
export const TransactionsProvider = ({children}) => {

  const [currentAccount, setCurrentAccount] = useState(''); //check account used
  const [formData, setFormData] = useState({ addresTo: '', amount: '', keyword: '', message: ''}); // set values in input form
  const [isLoading, setIsLoading] = useState(false); // while is processing transactions
  const [transactionCount, setTransactionCount] = useState(localStorage.getItem("transactionCount")); // count transactions
  const [transactions, setTransactions] = useState([]);


  //inputs changes
  const handleChange = (e, name) => {
    setFormData((prevState) => ({
      ...prevState,
      [name]: e.target.value
    }));
  };

  const getAllTransactions = async () => {
    try {
      if(!ethereum) return alert("Please Install Metamask");

      const transactionContract = getEthereumContract();

      const availableTransactions = await transactionContract.getAllTransactions();

      const structuredTransactions = availableTransactions.map((transaction) => ({
        addressTo: transaction.receiver,
        addressFrom: transaction.sender,
        timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(),
        message: transaction.message,
        keyword: transaction.keyword,
        amount: parseInt(transaction.amount._hex) / (10 ** 18)
      }));
      console.log(structuredTransactions);
      setTransactions(structuredTransactions);

    } catch (error) {
      console.log(error);

      throw new Error("No ethereum object");
    }
  }

  const checkIfWalletIsConnected = async () => {
    try {
      if(!ethereum) return alert("Please Install Metamask");
  
      const accounts = await ethereum.request({ method: 'eth_accounts'});
  
      if(accounts.length){
        setCurrentAccount(accounts[0]);

        getAllTransactions();
      } else {
        console.log("No accounts found");
      }  
      
    } catch (error) {
      console.log(error);

      throw new Error("No ethereum object");
    }
  }
  
  //cheking transaction to be added into transactions react component
  const checkIsTransactionExist = async () => {
    try {
      const transactionContract = getEthereumContract();

      const transactionCount = await transactionContract.getTransactionCount();

      window.localStorage.setItem("transactionCount", transactionCount);

    } catch (error) {
      console.log(error);

      throw new Error("No ethereum object");
    }
  }

  //function to pass on components (button)
  const connectWallet = async () => {
    try {
      if(!ethereum) return alert("Please Install Metamask");

      const accounts = await ethereum.request({ method: 'eth_requestAccounts'});

      setCurrentAccount(accounts[0]);

    } catch (error) {
      console.log(error);

      throw new Error("No ethereum object");
    }
  }
// to sent money via inputs
  const sendTransaction = async () => {
    try {
      if(!ethereum) return alert("Please Install Metamask");

      const { addressTo, amount, keyword, message } = formData;
      const transactionContract = getEthereumContract();
      const parsedAmount = ethers.utils.parseEther(amount);

      await ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: currentAccount,
          to: addressTo,
          gas: '0x5209', //21000 Gwei
          value: parsedAmount._hex // 0.00001
        }]
      })
        //log each transaction in contract calling function in Transactions.sol
      const transactionHash = await transactionContract.addToBlockchain(addressTo, parsedAmount, message, keyword);

      setIsLoading(true);
      console.log(`Loading - ${transactionHash}`);
      await transactionHash.wait();
      setIsLoading(false);
      console.log(`Succes - ${transactionHash}`);

      //get transaction counts via contract Transactions.sol
      const transactionCount = await transactionContract.getTransactionCount();

      setTransactionCount(transactionCount.toNumber());


    } catch (error) {
      console.log(error);

      throw new Error("No ethereum object");
    }
  }

  // starting check it is connected
  useEffect(() => {
    checkIfWalletIsConnected();
    checkIsTransactionExist();
  }, []);
  


  return (
    <TransactionsContext.Provider value={{ connectWallet, currentAccount, formData, setFormData, handleChange, sendTransaction, transactions, isLoading }}>
        {children}
    </TransactionsContext.Provider>
  )
}
