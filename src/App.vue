<script setup>
import { ref } from 'vue'
import { useMqtt } from './composables/useMqtt'

// MQTT configuration - Pre-filled with your friend's server details
// Note: Friend's code shows no path, so using exact format: ws://202.51.82.87:9001
const brokerUrl = ref('ws://202.51.82.87:9001') // Your friend's MQTT broker (no path as per friend's code)
const username = ref('') // MQTT username (optional - leave empty if not needed)
const password = ref('') // MQTT password (optional - leave empty if not needed)
const clientId = ref('') // Optional: custom client ID

const subscribeTopic = ref('gps/location') // Topic to subscribe to
const publishTopic = ref('gps/data') // Topic to publish to (ask your friend for the exact topic name!)
const publishMessage = ref('')

// Initialize MQTT connection
const {
  isConnected,
  isConnecting,
  error,
  messages,
  subscriptions,
  connect,
  disconnect,
  subscribe,
  unsubscribe,
  publish,
} = useMqtt()

// Handle connection with current settings
const handleConnect = () => {
  const clientOptions = {}

  // Only add credentials if they're provided (not empty)
  if (username.value && username.value.trim()) {
    clientOptions.username = username.value.trim()
  }
  if (password.value && password.value.trim()) {
    clientOptions.password = password.value.trim()
  }
  if (clientId.value && clientId.value.trim()) {
    clientOptions.clientId = clientId.value.trim()
  }

  // Connect with just URL if no credentials needed
  connect(brokerUrl.value, clientOptions)
}

// Handle subscription
const handleSubscribe = () => {
  if (subscribeTopic.value) {
    subscribe(subscribeTopic.value)
  }
}

// Handle unsubscription
const handleUnsubscribe = () => {
  if (subscribeTopic.value) {
    unsubscribe(subscribeTopic.value)
  }
}

// Handle publish
const handlePublish = () => {
  if (publishTopic.value && publishMessage.value) {
    publish(publishTopic.value, publishMessage.value)
    publishMessage.value = ''
  }
}

// Clear messages
const clearMessages = () => {
  messages.value = []
}

// Example GPS data publisher
const publishExampleGPS = () => {
  const gpsData = {
    latitude: 40.7128,
    longitude: -74.006,
    altitude: 10.5,
    speed: 25.3,
    timestamp: new Date().toISOString(),
    deviceId: 'gps-device-001',
  }
  publishMessage.value = JSON.stringify(gpsData, null, 2)
}

// Cancel connection attempt
const cancelConnection = () => {
  disconnect()
}

// Try alternative URL formats (some brokers need /mqtt or /ws path)
const tryAlternativeUrls = () => {
  const baseUrl = brokerUrl.value
  const alternatives = []

  // Extract base URL without path
  const urlMatch = baseUrl.match(/^(wss?:\/\/[^\/]+)(\/.*)?$/)
  if (urlMatch) {
    const base = urlMatch[1]
    alternatives.push(base + '/mqtt', base + '/ws', base + '/', base)
  }

  return [...new Set(alternatives)] // Remove duplicates
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">GPS Project - MQTT Remote Publishing</h1>
      <p class="text-gray-600 mb-8">Publish GPS data to your friend's remote MQTT server</p>

      <!-- Info Banner -->
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-blue-700">
              <strong>Need from your friend:</strong> Broker URL, Port, Topic name, and credentials
              (if required). See
              <code class="bg-blue-100 px-1 rounded">REMOTE_MQTT_GUIDE.md</code> for details.
            </p>
          </div>
        </div>
      </div>

      <!-- Connection Section -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Remote Server Connection</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Broker URL <span class="text-red-500">*</span>
            </label>
            <input
              v-model="brokerUrl"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ws://friend-server.com:8083/mqtt"
            />
            <p class="mt-1 text-xs text-gray-500">
              Format: ws://ip-or-domain:port/path or wss:// for secure connection
            </p>
            <div v-if="!brokerUrl.includes('/mqtt') && !brokerUrl.includes('/ws')" class="mt-2">
              <p class="text-xs text-amber-600 mb-1">
                💡 Tip: Some brokers need a path. Try adding
                <code class="bg-amber-100 px-1 rounded">/mqtt</code> or
                <code class="bg-amber-100 px-1 rounded">/ws</code>
              </p>
              <div class="flex gap-2 flex-wrap">
                <button
                  @click="brokerUrl = brokerUrl.replace(/\/.*$/, '') + '/mqtt'"
                  class="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200"
                >
                  Try with /mqtt
                </button>
                <button
                  @click="brokerUrl = brokerUrl.replace(/\/.*$/, '') + '/ws'"
                  class="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200"
                >
                  Try with /ws
                </button>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Username <span class="text-gray-400 text-xs">(optional)</span>
              </label>
              <input
                v-model="username"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Leave empty if not needed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Password <span class="text-gray-400 text-xs">(optional)</span>
              </label>
              <input
                v-model="password"
                type="password"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Leave empty if not needed"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Client ID (optional)
            </label>
            <input
              v-model="clientId"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Auto-generated if left empty"
            />
          </div>
        </div>

        <div class="flex gap-4 items-center mt-6">
          <button
            v-if="!isConnecting"
            @click="handleConnect"
            :disabled="isConnected || !brokerUrl"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Connect to Remote Server
          </button>

          <button
            v-if="isConnecting"
            @click="cancelConnection"
            class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            Cancel Connection
          </button>

          <button
            @click="disconnect"
            :disabled="!isConnected && !isConnecting"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Disconnect
          </button>

          <div class="flex items-center gap-2">
            <div
              :class="[
                'w-3 h-3 rounded-full',
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400',
              ]"
            ></div>
            <span class="text-sm text-gray-600">
              {{ isConnected ? 'Connected' : 'Disconnected' }}
            </span>
          </div>
        </div>

        <div v-if="error" class="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Connection Error:</strong> {{ error.message || error }}
          <p class="text-xs mt-2 font-semibold">Troubleshooting:</p>
          <ul class="text-xs mt-1 list-disc list-inside space-y-1">
            <li>
              Verify broker URL is correct (try adding <code>/mqtt</code> or <code>/ws</code> path)
            </li>
            <li>Check if port 9001 is open and accessible</li>
            <li>Verify username and password are correct</li>
            <li>Ensure friend's server is running and accessible</li>
            <li>Check browser console (F12) for detailed error messages</li>
            <li>Try testing with public broker: <code>ws://broker.hivemq.com:8000/mqtt</code></li>
          </ul>
        </div>
      </div>

      <!-- Publish Section (Main Focus for Remote Publishing) -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-purple-200">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">Publish to Remote Server</h2>
          <span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded"
            >Your Friend Subscribes Here</span
          >
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Topic Name <span class="text-red-500">*</span>
            <span class="text-xs text-gray-500 font-normal"
              >(Coordinate exact name with friend - case sensitive!)</span
            >
          </label>
          <input
            v-model="publishTopic"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            placeholder="gps/data"
          />
          <p class="text-xs text-gray-500">Examples: gps/data, sensor/readings, device/location</p>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Message (JSON or Text)
          </label>
          <textarea
            v-model="publishMessage"
            rows="6"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder='{"latitude": 40.7128, "longitude": -74.0060, "timestamp": "2024-01-01T12:00:00Z"}'
          ></textarea>
          <div class="mt-2 flex gap-2">
            <button
              @click="publishExampleGPS"
              class="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Load Example GPS Data
            </button>
          </div>
        </div>

        <div class="flex gap-4 items-center">
          <button
            @click="handlePublish"
            :disabled="!isConnected || !publishMessage || !publishTopic"
            class="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
          >
            📤 Publish to Remote Server
          </button>
          <span v-if="isConnected && publishTopic" class="text-sm text-gray-600">
            Will publish to: <code class="bg-gray-100 px-2 py-1 rounded">{{ publishTopic }}</code>
          </span>
        </div>
      </div>

      <!-- Subscribe Section (Optional - for receiving messages) -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Subscribe (Optional)</h2>
        <p class="text-sm text-gray-600 mb-4">
          Subscribe to topics if you want to receive messages from the server
        </p>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2"> Topic </label>
          <input
            v-model="subscribeTopic"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="gps/location"
          />
        </div>

        <div class="flex gap-4">
          <button
            @click="handleSubscribe"
            :disabled="!isConnected"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Subscribe
          </button>

          <button
            @click="handleUnsubscribe"
            :disabled="!isConnected"
            class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Unsubscribe
          </button>
        </div>

        <div v-if="subscriptions.size > 0" class="mt-4">
          <p class="text-sm text-gray-600 mb-2">Subscribed Topics:</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="topic in subscriptions"
              :key="topic"
              class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {{ topic }}
            </span>
          </div>
        </div>
      </div>

      <!-- Messages Section -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Received Messages</h2>
          <button
            @click="clearMessages"
            class="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Clear
          </button>
        </div>

        <div v-if="messages.length === 0" class="text-gray-500 text-center py-8">
          No messages received yet. Subscribe to a topic to see messages here.
        </div>

        <div v-else class="space-y-3 max-h-96 overflow-y-auto">
          <div
            v-for="(msg, index) in messages"
            :key="index"
            class="p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div class="flex justify-between items-start mb-2">
              <span class="font-semibold text-blue-600">{{ msg.topic }}</span>
              <span class="text-xs text-gray-500">{{ msg.timestamp }}</span>
            </div>
            <pre class="text-sm text-gray-700 whitespace-pre-wrap break-words">{{
              JSON.stringify(msg.data, null, 2)
            }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
