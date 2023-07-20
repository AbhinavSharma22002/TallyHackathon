const fetch = require('isomorphic-fetch');
const fetchText = async () => {
    const url = 'https://random-word-api.vercel.app/api?words=20'; // Replace this with the URL of the API you want to fetch
    try {
        const response = await fetch(url);
    
        if (!response.ok) {
          throw new Error('Failed to fetch data from the API');
        }
        const data = await response.json();
        let text = '';
        const characters = ['.',' ','!',',',''];
        for(var i = 0;i<data.length;i++){
            text+= data[i]+characters[Math.floor(Math.random() * characters.length)];
        }
        return text; // Return the fetched data
      } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // Re-throw the error to handle it later if needed
      }
  };

  module.exports = fetchText;
  