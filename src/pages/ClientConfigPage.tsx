import React, { useState, useEffect } from 'react';
import { clientConfigService } from '../services/api';
import type { ClientConfig, ClientConfigCreateRequest } from '../types/clientConfig';
import { InputField } from '../components/InputField';

export const ClientConfigPage: React.FC = () => {
  const [clients, setClients] = useState<ClientConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<ClientConfigCreateRequest>({
    client_name: '',
    client_api_key: '',
    client_api_base_url: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clientConfigService.getClients();
      if (response.success) {
        setClients(response.clients || []);
      } else {
        setError('Failed to load clients');
      }
    } catch (err: any) {
      console.error('Error loading clients:', err);
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Failed to load clients';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await clientConfigService.createClient(formData);
      if (response.success) {
        setSuccess(response.message || 'Client added successfully');
        setFormData({
          client_name: '',
          client_api_key: '',
          client_api_base_url: '',
        });
        setShowAddForm(false);
        await loadClients();
      } else {
        setError('Failed to add client');
      }
    } catch (err: any) {
      console.error('Error adding client:', err);
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Failed to add client';
      setError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (clientName: string) => {
    setFormLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await clientConfigService.deleteClient(clientName);
      if (response.success) {
        setSuccess(response.message || 'Client deleted successfully');
        setDeleteConfirm(null);
        await loadClients();
      } else {
        setError('Failed to delete client');
      }
    } catch (err: any) {
      console.error('Error deleting client:', err);
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Failed to delete client';
      setError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-binance-dark">
        <div className="text-center">
          <div className="text-binance-text-secondary mb-2">Loading clients...</div>
          <div className="w-8 h-8 border-4 border-binance-yellow border-t-transparent rounded-full animate-spin mx-auto mt-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-binance-dark py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-binance-text mb-2">Client API Config</h1>
              <p className="text-binance-text-secondary">Manage client API configurations</p>
            </div>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                clearMessages();
                if (!showAddForm) {
                  setFormData({
                    client_name: '',
                    client_api_key: '',
                    client_api_base_url: '',
                  });
                }
              }}
              className="btn-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {showAddForm ? 'Cancel' : 'Add Client'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-md bg-binance-red/20 text-binance-red border border-binance-red/30 flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
            <button onClick={clearMessages} className="ml-4 hover:opacity-70">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 rounded-md bg-binance-green/20 text-binance-green border border-binance-green/30 flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
            <button onClick={clearMessages} className="ml-4 hover:opacity-70">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Add Client Form */}
        {showAddForm && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-binance-text mb-4">Add New Client</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <InputField
                label="Client Name"
                value={formData.client_name}
                onChange={(value) => setFormData({ ...formData, client_name: value as string })}
                placeholder="Enter client name"
                required
              />
              <InputField
                label="Client API Key"
                value={formData.client_api_key}
                onChange={(value) => setFormData({ ...formData, client_api_key: value as string })}
                type="password"
                placeholder="Enter client API key"
                required
              />
              <InputField
                label="Client API Base URL"
                value={formData.client_api_base_url}
                onChange={(value) => setFormData({ ...formData, client_api_base_url: value as string })}
                placeholder="https://example.com/api"
                required
              />
              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-primary flex items-center gap-2"
                >
                  {formLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Add Client
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    clearMessages();
                  }}
                  className="px-4 py-2 rounded-md font-medium text-sm text-binance-text-secondary hover:text-binance-text hover:bg-binance-gray-light transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Clients List */}
        <div className="card">
          <div className="px-4 py-3 border-b border-binance-gray-border">
            <h2 className="text-lg font-semibold text-binance-text">
              Clients ({clients.length})
            </h2>
          </div>
          {clients.length === 0 ? (
            <div className="p-8 text-center text-binance-text-secondary">
              No clients configured. Click "Add Client" to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-binance-gray-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-binance-text-secondary">
                      Client Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-binance-text-secondary">
                      API Base URL
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-binance-text-secondary">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client, index) => (
                    <tr
                      key={`${client.client_name}-${index}`}
                      className="border-b border-binance-gray-border hover:bg-binance-gray-light transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-semibold text-binance-text">{client.client_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-binance-text-secondary">{client.client_api_base_url}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {deleteConfirm === client.client_name ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm text-binance-text-secondary mr-2">Delete?</span>
                            <button
                              onClick={() => handleDelete(client.client_name)}
                              disabled={formLoading}
                              className="px-3 py-1.5 rounded-md text-sm font-medium bg-binance-red/20 text-binance-red hover:bg-binance-red/30 border border-binance-red/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {formLoading ? 'Deleting...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              disabled={formLoading}
                              className="px-3 py-1.5 rounded-md text-sm font-medium text-binance-text-secondary hover:bg-binance-gray-light transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(client.client_name)}
                            disabled={formLoading}
                            className="px-3 py-1.5 rounded-md text-sm font-medium text-binance-red hover:bg-binance-red/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

