import React, { useState, useEffect } from 'react';
import { Plus, Play, Square, Eye, Download, X, Calendar as CalendarIcon } from 'lucide-react';
import {
  getAllEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  getTransactionsByEvent,
} from '../../utils/db';
import { formatCurrency, formatDate, formatDateTime, exportEventReportToPDF, exportEventReportToExcel } from '../../utils/exports';

function EventsTab({ currentUser }) {
  const [events, setEvents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventTransactions, setEventTransactions] = useState([]);
  const [newEvent, setNewEvent] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const evts = await getAllEvents();
    setEvents(evts);
  }

  const handleAddEvent = async (e) => {
    e.preventDefault();
    try {
      // Check if there's already an active event
      const activeEvent = events.find(evt => evt.status === 'active');
      if (activeEvent) {
        if (!window.confirm(`There is already an active event "${activeEvent.name}". It will be ended to start this new event. Continue?`)) {
          return;
        }
        await updateEvent(activeEvent.id, { status: 'completed' });
      }

      await addEvent(newEvent);
      await loadEvents();
      setShowAddModal(false);
      setNewEvent({
        name: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
      });
    } catch (error) {
      alert('Failed to add event');
      console.error(error);
    }
  };

  const handleEndEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to end this event?')) {
      return;
    }

    try {
      await updateEvent(eventId, { status: 'completed' });
      await loadEvents();
    } catch (error) {
      alert('Failed to end event');
      console.error(error);
    }
  };

  const handleViewDetails = async (event) => {
    setSelectedEvent(event);
    const txs = await getTransactionsByEvent(event.id);
    setEventTransactions(txs);
    setShowDetailsModal(true);
  };

  const handleDeleteEvent = async (eventId, eventName) => {
    if (!window.confirm(`Are you sure you want to delete "${eventName}"? This will not delete the associated transactions, but they will no longer be linked to this event.`)) {
      return;
    }

    try {
      await deleteEvent(eventId);
      await loadEvents();
    } catch (error) {
      alert('Failed to delete event');
      console.error(error);
    }
  };

  const handleExportPDF = () => {
    const doc = exportEventReportToPDF(selectedEvent, eventTransactions);
    doc.save(`${selectedEvent.name}_report.pdf`);
  };

  const handleExportExcel = () => {
    exportEventReportToExcel(
      selectedEvent,
      eventTransactions,
      `${selectedEvent.name}_report.xlsx`
    );
  };

  const activeEvent = events.find(evt => evt.status === 'active');
  const completedEvents = events.filter(evt => evt.status === 'completed');
  const totalRevenue = eventTransactions.reduce((sum, tx) => sum + tx.total, 0);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Events Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          Create Event
        </button>
      </div>

      {/* Active Event Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Event</h3>
        {activeEvent ? (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Play className="w-5 h-5 text-green-600" />
                  <h4 className="text-xl font-bold text-green-900">{activeEvent.name}</h4>
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  <div>Date: {formatDate(activeEvent.date)}</div>
                  {activeEvent.description && <div>Description: {activeEvent.description}</div>}
                  <div>Started: {formatDateTime(activeEvent.createdAt)}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewDetails(activeEvent)}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg transition"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => handleEndEvent(activeEvent.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                >
                  <Square className="w-4 h-4" />
                  End Event
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No active event. Create one to start tracking event purchases.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
            >
              <Plus className="w-5 h-5" />
              Create Event
            </button>
          </div>
        )}
      </div>

      {/* Completed Events Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Completed Events ({completedEvents.length})</h3>
        {completedEvents.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
            No completed events yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedEvents
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map(event => (
                <div key={event.id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">{event.name}</h4>
                    <div className="text-sm text-gray-500 mt-1">{formatDate(event.date)}</div>
                    {event.description && (
                      <div className="text-sm text-gray-600 mt-2">{event.description}</div>
                    )}
                  </div>

                  <div className="mb-4 pt-3 border-t border-gray-200">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      Completed
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(event)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View Report
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id, event.name)}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Create New Event</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Alumni Gathering, Board Meeting"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Date *
                </label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  rows="3"
                  placeholder="Optional event details"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  This event will be immediately activated. All purchases will be charged to this event until it's ended.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                >
                  Create & Start
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Details/Report Modal */}
      {showDetailsModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedEvent.name}</h3>
                  <div className="text-gray-600 mt-1">Event Report</div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Event Date</div>
                    <div className="font-medium text-gray-900">{formatDate(selectedEvent.date)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Status</div>
                    <div className="font-medium">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        selectedEvent.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedEvent.status === 'active' ? 'Active' : 'Completed'}
                      </span>
                    </div>
                  </div>
                  {selectedEvent.description && (
                    <div className="col-span-2">
                      <div className="text-gray-600">Description</div>
                      <div className="font-medium text-gray-900">{selectedEvent.description}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between bg-primary-50 rounded-lg p-4">
                <div>
                  <div className="text-sm text-primary-700">Total Revenue</div>
                  <div className="text-3xl font-bold text-primary-900">{formatCurrency(totalRevenue)}</div>
                  <div className="text-sm text-primary-700 mt-1">{eventTransactions.length} transactions</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Excel
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Transactions ({eventTransactions.length})
              </h4>

              {eventTransactions.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No transactions for this event yet
                </div>
              ) : (
                <div className="space-y-3">
                  {eventTransactions
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(tx => (
                      <div key={tx.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm text-gray-600">{formatDateTime(tx.date)}</div>
                          <div className="text-lg font-semibold text-primary-600">
                            {formatCurrency(tx.total)}
                          </div>
                        </div>
                        <div className="text-sm text-gray-700">
                          <div className="font-medium">Bartender: {tx.bartender}</div>
                          <div className="mt-1">
                            Items: {tx.items?.map(item => `${item.name} (×${item.quantity})`).join(', ')}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventsTab;
