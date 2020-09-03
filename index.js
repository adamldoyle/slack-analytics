require('dotenv').config();
const axios = require('axios');

const TOKEN = process.env.TOKEN;

async function fetchChannels() {
  const response = await axios.get('https://slack.com/api/conversations.list', {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });
  return response.data.channels.map((channel) => ({
    id: channel.id,
    name: channel.name,
  }));
}

async function fetchMessagesWithCursor(channelId, cursor) {
  const response = await axios.get(
    `https://slack.com/api/conversations.history?channel=${channelId}${
      cursor ? `&cursor=${cursor}` : ''
    }`,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    },
  );
  return response.data;
}

async function fetchMessages(channelId) {
  let cursor = null;
  let hasMore = true;
  let allMessages = [];
  while (hasMore) {
    const data = await fetchMessagesWithCursor(channelId, cursor);
    allMessages = allMessages.concat(data.messages);
    hasMore = data.has_more;
    if (hasMore) {
      cursor = data.response_metadata.next_cursor;
    }
  }
  return allMessages;
}

async function fetchUsers() {
  const response = await axios.get(`https://slack.com/api/users.list`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });
  return response.data.members.map((user) => ({
    id: user.id,
    name: user.name,
  }));
}

async function gatherAll() {
  const channels = await fetchChannels();
  const channelCounts = await Promise.all(
    channels.map(async (channel) => {
      const messages = await fetchMessages(channel.id);
      const channelCount = messages.reduce((acc, message) => {
        if (message.user) {
          if (!acc[message.user]) {
            acc[message.user] = 0;
          }
          acc[message.user]++;
        }
        return acc;
      }, {});
      return channelCount;
    }),
  );
  const totals = channelCounts.reduce((acc, channelCount) => {
    Object.keys(channelCount).forEach((userId) => {
      if (!acc[userId]) {
        acc[userId] = 0;
      }
      acc[userId] += channelCount[userId];
    });
    return acc;
  }, {});

  const users = await fetchUsers();

  console.log(channelCounts);
  console.log(totals);
  console.log(channels);
  console.log(users);
}

gatherAll();
