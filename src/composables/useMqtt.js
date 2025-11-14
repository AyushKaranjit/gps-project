import { ref, onUnmounted } from 'vue'
import mqtt from 'mqtt'

/**
 * Vue 3 composable for MQTT connection management
 * @param {Object} options - MQTT connection options
 * @param {string} options.brokerUrl - MQTT broker URL (e.g., 'ws://localhost:8083/mqtt' or 'mqtt://localhost:1883')
 * @param {Object} options.clientOptions - MQTT client options (username, password, clientId, etc.)
 * @returns {Object} MQTT connection state and methods
 */
export function useMqtt(options = {}) {
  const {
    brokerUrl = 'ws://localhost:8083/mqtt',
    clientOptions = {}
  } = options

  const client = ref(null)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const error = ref(null)
  const messages = ref([])
  const subscriptions = ref(new Set())
  const currentBrokerUrl = ref(brokerUrl)
  const currentClientOptions = ref(clientOptions)
  const connectionTimeout = ref(null)

  /**
   * Connect to MQTT broker
   * @param {string} url - Optional broker URL (uses currentBrokerUrl if not provided)
   * @param {Object} opts - Optional client options (uses currentClientOptions if not provided)
   */
  const connect = (url = null, opts = null) => {
    if (isConnecting.value || isConnected.value) {
      return
    }

    // Update broker URL and options if provided
    if (url) {
      currentBrokerUrl.value = url
    }
    if (opts) {
      currentClientOptions.value = { ...currentClientOptions.value, ...opts }
    }

    isConnecting.value = true
    error.value = null

    // Clear any existing timeout
    if (connectionTimeout.value) {
      clearTimeout(connectionTimeout.value)
    }

    // Set connection timeout (15 seconds)
    connectionTimeout.value = setTimeout(() => {
      if (isConnecting.value && !isConnected.value) {
        isConnecting.value = false
        error.value = new Error('Connection timeout: Unable to connect to broker. Check URL, port, and network connectivity.')
        if (client.value) {
          client.value.end()
          client.value = null
        }
        console.error('Connection timeout')
      }
    }, 15000)

    try {
      const defaultOptions = {
        clientId: `vue-mqtt-${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 10 * 1000, // 10 second timeout
        ...currentClientOptions.value
      }

      client.value = mqtt.connect(currentBrokerUrl.value, defaultOptions)

      // Connection event handlers
      client.value.on('connect', () => {
        isConnected.value = true
        isConnecting.value = false
        error.value = null
        if (connectionTimeout.value) {
          clearTimeout(connectionTimeout.value)
          connectionTimeout.value = null
        }
        console.log('MQTT Connected')
      })

      client.value.on('error', (err) => {
        error.value = err
        isConnecting.value = false
        if (connectionTimeout.value) {
          clearTimeout(connectionTimeout.value)
          connectionTimeout.value = null
        }
        console.error('MQTT Error:', err)
      })

      client.value.on('close', () => {
        isConnected.value = false
        isConnecting.value = false
        if (connectionTimeout.value) {
          clearTimeout(connectionTimeout.value)
          connectionTimeout.value = null
        }
        console.log('MQTT Disconnected')
      })

      client.value.on('reconnect', () => {
        isConnecting.value = true
        console.log('MQTT Reconnecting...')
      })

      client.value.on('offline', () => {
        isConnected.value = false
        isConnecting.value = false
        if (connectionTimeout.value) {
          clearTimeout(connectionTimeout.value)
          connectionTimeout.value = null
        }
        error.value = new Error('Connection went offline')
        console.log('MQTT Offline')
      })

      // Message handler
      client.value.on('message', (topic, message) => {
        const payload = message.toString()
        try {
          // Try to parse as JSON, fallback to string
          const data = JSON.parse(payload)
          messages.value.unshift({
            topic,
            data,
            raw: payload,
            timestamp: new Date().toISOString()
          })
        } catch {
          messages.value.unshift({
            topic,
            data: payload,
            raw: payload,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (err) {
      error.value = err
      isConnecting.value = false
      console.error('Failed to create MQTT client:', err)
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  const disconnect = () => {
    if (connectionTimeout.value) {
      clearTimeout(connectionTimeout.value)
      connectionTimeout.value = null
    }
    
    if (client.value) {
      // Unsubscribe from all topics
      subscriptions.value.forEach((topic) => {
        client.value.unsubscribe(topic)
      })
      subscriptions.value.clear()

      client.value.end()
      client.value = null
      isConnected.value = false
      isConnecting.value = false
      messages.value = []
    }
  }

  /**
   * Subscribe to a topic
   * @param {string|string[]} topic - Topic(s) to subscribe to
   * @param {Object} options - Subscription options (qos, etc.)
   */
  const subscribe = (topic, options = {}) => {
    if (!client.value || !isConnected.value) {
      console.warn('MQTT client not connected')
      return
    }

    const topics = Array.isArray(topic) ? topic : [topic]
    const defaultOptions = { qos: 0, ...options }

    topics.forEach((t) => {
      if (!subscriptions.value.has(t)) {
        client.value.subscribe(t, defaultOptions, (err) => {
          if (err) {
            console.error(`Failed to subscribe to ${t}:`, err)
          } else {
            subscriptions.value.add(t)
            console.log(`Subscribed to ${t}`)
          }
        })
      }
    })
  }

  /**
   * Unsubscribe from a topic
   * @param {string|string[]} topic - Topic(s) to unsubscribe from
   */
  const unsubscribe = (topic) => {
    if (!client.value || !isConnected.value) {
      return
    }

    const topics = Array.isArray(topic) ? topic : [topic]

    topics.forEach((t) => {
      if (subscriptions.value.has(t)) {
        client.value.unsubscribe(t, (err) => {
          if (err) {
            console.error(`Failed to unsubscribe from ${t}:`, err)
          } else {
            subscriptions.value.delete(t)
            console.log(`Unsubscribed from ${t}`)
          }
        })
      }
    })
  }

  /**
   * Publish a message to a topic
   * @param {string} topic - Topic to publish to
   * @param {string|Object} message - Message to publish
   * @param {Object} options - Publish options (qos, retain, etc.)
   */
  const publish = (topic, message, options = {}) => {
    if (!client.value || !isConnected.value) {
      console.warn('MQTT client not connected')
      return
    }

    const payload =
      typeof message === 'object' ? JSON.stringify(message) : String(message)
    const defaultOptions = { qos: 0, retain: false, ...options }

    client.value.publish(topic, payload, defaultOptions, (err) => {
      if (err) {
        console.error(`Failed to publish to ${topic}:`, err)
      } else {
        console.log(`Published to ${topic}:`, payload)
      }
    })
  }

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect()
  })

  return {
    // State
    client,
    isConnected,
    isConnecting,
    error,
    messages,
    subscriptions,
    currentBrokerUrl,
    currentClientOptions,

    // Methods
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    publish
  }
}

