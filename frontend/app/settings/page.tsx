'use client'

import { useState, useEffect } from 'react'
import { Settings, Mail, Server, Download, Bell, Shield, Info, Smartphone, TestTube } from 'lucide-react'
import { pushNotificationService } from '@/lib/push-notifications'
import { useQuery } from 'react-query'
import { apiService } from '@/lib/api'

export default function SettingsPage() {
    const [notificationsEnabled, setNotificationsEnabled] = useState(false)
    const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false)
    const [autoDownload, setAutoDownload] = useState(false)
    const [email, setEmail] = useState('')
    const [smtpSettings, setSmtpSettings] = useState({
        host: '',
        port: '',
        username: '',
        password: '',
        sender: ''
    })
    const [pushSupported, setPushSupported] = useState(false)
    const [pushPermission, setPushPermission] = useState<NotificationPermission>('default')

    // Query push notification stats
    const { data: pushStats } = useQuery(
        'push-stats',
        () => apiService.getPushStats(),
        {
            refetchInterval: 30000, // Refresh every 30 seconds
            enabled: pushSupported
        }
    )

    useEffect(() => {
        // Initialize push notifications and check current state
        const initializePush = async () => {
            try {
                const supported = pushNotificationService.isSupported()
                setPushSupported(supported)

                if (supported) {
                    await pushNotificationService.initialize()
                    const permission = pushNotificationService.getPermissionState()
                    setPushPermission(permission.permission)

                    // Check if currently subscribed
                    const subscribed = await pushNotificationService.isSubscribed()
                    setPushNotificationsEnabled(subscribed)
                }
            } catch (error) {
                console.error('Failed to initialize push notifications:', error)
            }
        }

        initializePush()
    }, [])

    const handleSave = () => {
        // Here you would typically save to localStorage or send to backend
        alert('Einstellungen gespeichert!')
    }

    const handlePushNotificationToggle = async (enabled: boolean) => {
        try {
            if (enabled) {
                await pushNotificationService.subscribe()
                setPushNotificationsEnabled(true)
                setPushPermission('granted')
                alert('Push-Benachrichtigungen aktiviert!')
            } else {
                await pushNotificationService.unsubscribe()
                setPushNotificationsEnabled(false)
                alert('Push-Benachrichtigungen deaktiviert!')
            }
        } catch (error) {
            console.error('Error toggling push notifications:', error)
            alert(`Fehler: ${(error as Error).message}`)
        }
    }

    const handleTestNotification = async () => {
        try {
            await pushNotificationService.sendTestNotification()
            alert('Test-Benachrichtigung gesendet!')
        } catch (error) {
            console.error('Error sending test notification:', error)
            alert(`Fehler beim Senden der Test-Benachrichtigung: ${(error as Error).message}`)
        }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-treasure mb-4 shadow-lg">
                    <Settings className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    Einstellungen
                </h1>
                <p className="text-lg text-gray-600">
                    Konfiguriere deine One Piece Offline App
                </p>
            </div>

            {/* General Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                        <Download className="w-5 h-5 mr-2" />
                        Download-Einstellungen
                    </h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-gray-900">Automatischer Download</label>
                            <p className="text-sm text-gray-500">Neue Kapitel automatisch herunterladen</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoDownload}
                                onChange={(e) => setAutoDownload(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Download-Verzeichnis
                        </label>
                        <input
                            type="text"
                            value="./data"
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Konfiguriert über Backend .env Datei</p>
                    </div>
                </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                        <Bell className="w-5 h-5 mr-2" />
                        Benachrichtigungen
                    </h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-gray-900">E-Mail Benachrichtigungen</label>
                            <p className="text-sm text-gray-500">Bei neuen Kapiteln benachrichtigen</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notificationsEnabled}
                                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        </label>
                    </div>

                    {notificationsEnabled && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                E-Mail Adresse
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="deine@email.de"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            />
                        </div>
                    )}

                    <hr className="border-gray-200" />

                    {/* Web Push Notifications */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Smartphone className="w-5 h-5 text-gray-400" />
                                <div>
                                    <label className="text-sm font-medium text-gray-900">Web Push-Benachrichtigungen</label>
                                    <p className="text-sm text-gray-500">
                                        {pushSupported
                                            ? 'Browser-Benachrichtigungen ohne E-Mail-Setup'
                                            : 'Nicht unterstützt in diesem Browser'
                                        }
                                    </p>
                                </div>
                            </div>
                            {pushSupported && (
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={pushNotificationsEnabled}
                                        onChange={(e) => handlePushNotificationToggle(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            )}
                        </div>

                        {pushSupported && (
                            <>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Browser-Unterstützung:</span>
                                        <span className="text-green-600 font-medium">✓ Verfügbar</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Berechtigung:</span>
                                        <span className={`font-medium ${pushPermission === 'granted' ? 'text-green-600' :
                                                pushPermission === 'denied' ? 'text-red-600' : 'text-yellow-600'
                                            }`}>
                                            {pushPermission === 'granted' ? '✓ Erteilt' :
                                                pushPermission === 'denied' ? '✗ Verweigert' : '? Ausstehend'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Status:</span>
                                        <span className={`font-medium ${pushNotificationsEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                                            {pushNotificationsEnabled ? '✓ Aktiv' : '✗ Inaktiv'}
                                        </span>
                                    </div>
                                    {pushStats && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Abonnenten:</span>
                                            <span className="text-blue-600 font-medium">{pushStats.subscribers}</span>
                                        </div>
                                    )}
                                </div>

                                {pushNotificationsEnabled && (
                                    <button
                                        onClick={handleTestNotification}
                                        className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200"
                                    >
                                        <TestTube className="w-4 h-4 mr-2" />
                                        Test-Benachrichtigung senden
                                    </button>
                                )}
                            </>
                        )}

                        {!pushSupported && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex">
                                    <Info className="flex-shrink-0 w-5 h-5 text-yellow-400 mt-0.5" />
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-yellow-800">
                                            Browser-Unterstützung erforderlich
                                        </h3>
                                        <div className="mt-2 text-sm text-yellow-700">
                                            <p>
                                                Web Push-Benachrichtigungen werden in diesem Browser nicht unterstützt.
                                                Verwende einen modernen Browser wie Chrome, Firefox oder Safari.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SMTP Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                        <Mail className="w-5 h-5 mr-2" />
                        SMTP Konfiguration
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Für E-Mail Benachrichtigungen erforderlich
                    </p>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                SMTP Server
                            </label>
                            <input
                                type="text"
                                value={smtpSettings.host}
                                onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                                placeholder="smtp.gmail.com"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Port
                            </label>
                            <input
                                type="number"
                                value={smtpSettings.port}
                                onChange={(e) => setSmtpSettings({ ...smtpSettings, port: e.target.value })}
                                placeholder="587"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Benutzername
                        </label>
                        <input
                            type="text"
                            value={smtpSettings.username}
                            onChange={(e) => setSmtpSettings({ ...smtpSettings, username: e.target.value })}
                            placeholder="dein-smtp-username"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Passwort
                        </label>
                        <input
                            type="password"
                            value={smtpSettings.password}
                            onChange={(e) => setSmtpSettings({ ...smtpSettings, password: e.target.value })}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Absender E-Mail
                        </label>
                        <input
                            type="email"
                            value={smtpSettings.sender}
                            onChange={(e) => setSmtpSettings({ ...smtpSettings, sender: e.target.value })}
                            placeholder="noreply@example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex">
                            <Info className="flex-shrink-0 w-5 h-5 text-blue-400 mt-0.5" />
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">
                                    Hinweis
                                </h3>
                                <div className="mt-2 text-sm text-blue-700">
                                    <p>
                                        SMTP-Einstellungen werden in der Backend .env Datei konfiguriert.
                                        Diese Felder dienen nur zur Anzeige der aktuellen Konfiguration.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Server Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                        <Server className="w-5 h-5 mr-2" />
                        Server-Information
                    </h2>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Backend URL
                            </label>
                            <input
                                type="text"
                                value="http://localhost:8001"
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Frontend Port
                            </label>
                            <input
                                type="text"
                                value="3001"
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quell-Website
                        </label>
                        <input
                            type="text"
                            value="https://onepiece.tube"
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                        />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors duration-200"
                >
                    <Shield className="w-4 h-4 mr-2" />
                    Einstellungen speichern
                </button>
            </div>
        </div>
    )
}
