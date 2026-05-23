import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CreditCard, 
  DollarSign, 
  AlertTriangle, 
  Search, 
  Plus, 
  Send, 
  Check, 
  X, 
  Globe, 
  ListFilter, 
  History, 
  Settings, 
  Languages, 
  UserPlus, 
  Trash2,
  RefreshCw,
  PlayCircle,
  Edit2,
  MessageSquare,
  Calendar,
  ExternalLink,
  AlertCircle,
  Smartphone,
  LogOut,
  Download,
  Lock,
  User,
  Mail,
  MapPin,
  Phone,
  Camera,
  Upload,
  Building2,
  Tv,
  Box,
  Wifi,
  Star,
  ChevronRight,
  Shield,
  HeadphonesIcon,
  ArrowLeft
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
const WHATSAPP_BASE = import.meta.env.VITE_WHATSAPP_API_BASE || 'http://localhost:18789';

// High-fidelity Mock Data for seamless fallback
const MOCK_PLANS = [
  { id: '1', name: 'Odia Basic Pack', price: 220.00, duration_days: 30 },
  { id: '2', name: 'Standard Digital SD', price: 280.00, duration_days: 30 },
  { id: '3', name: 'Premium HD Odisha', price: 350.00, duration_days: 30 },
];

const MOCK_CUSTOMERS = [
  { id: '101', name: 'Manoj Kumar Sahoo', phone_number: '+919876543210', plan: '3', plan_details: MOCK_PLANS[2], price_override: null, activation_date: '2026-05-01', expiry_date: '2026-05-31', is_paid: true, language_preference: 'OD', reminder_days_before: 2, days_left: 10 },
  { id: '102', name: 'Priyanka Mohapatra', phone_number: '+917894376226', plan: '2', plan_details: MOCK_PLANS[1], price_override: 260.00, activation_date: '2026-04-20', expiry_date: '2026-05-20', is_paid: false, language_preference: 'OD', reminder_days_before: 1, days_left: -1 },
  { id: '103', name: 'Rajesh Senapati', phone_number: '+918877665544', plan: '1', plan_details: MOCK_PLANS[0], price_override: null, activation_date: '2026-05-05', expiry_date: '2026-06-04', is_paid: true, language_preference: 'EN', reminder_days_before: 3, days_left: 14 },
  { id: '104', name: 'Dilip Behera', phone_number: '+917766554433', plan: '2', plan_details: MOCK_PLANS[1], price_override: null, activation_date: '2026-04-22', expiry_date: '2026-05-22', is_paid: false, language_preference: 'EN', reminder_days_before: 2, days_left: 1 },
];

const MOCK_LOGS = [
  { id: '1', customer_name: 'Priyanka Mohapatra', message_type: 'REMINDER', message_content: 'ପ୍ରିୟ Priyanka Mohapatra, ଆପଣଙ୍କର କେବୁଲ୍ ଟିଭି ପ୍ଲାନ Standard Digital SD [2026-05-20] ରେ ଶେଷ ହେଉଛି। ଦୟାକରି Rs. 260 ପ୍ରଦାନ କରନ୍ତୁ।', language: 'OD', sent_at: '2026-05-19T10:15:00Z', status: 'SENT' },
  { id: '2', customer_name: 'Manoj Kumar Sahoo', message_type: 'RECEIPT', message_content: 'ଧନ୍ୟବାଦ Manoj Kumar Sahoo! ଆପଣଙ୍କର Rs. 350 ର ପେମେଣ୍ଟ ମିଳିଗଲା। ପ୍ଲାନ [2026-05-31] ପର୍ଯ୍ୟନ୍ତ ସଫଳତାର ସହ ନବୀକରଣ ହୋଇଛି।', language: 'OD', sent_at: '2026-05-01T09:30:00Z', status: 'SENT' },
];

const calculateExpiryDateJS = (activationDateStr, durationDays) => {
  const actDate = new Date(activationDateStr);
  if (durationDays % 30 === 0) {
    const monthsToAdd = durationDays / 30;
    const day = actDate.getDate();
    actDate.setMonth(actDate.getMonth() + monthsToAdd);
    if (actDate.getDate() !== day) {
      actDate.setDate(0); // Clamp to end of previous month
    }
    return actDate.toISOString().split('T')[0];
  } else {
    actDate.setDate(actDate.getDate() + durationDays);
    return actDate.toISOString().split('T')[0];
  }
};

function App() {
  // Session Authentication state
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('mahalaxmi_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [logs, setLogs] = useState([]);
  const [villages, setVillages] = useState([]);
  const [stats, setStats] = useState({
    total_customers: 0,
    paid_customers: 0,
    unpaid_customers: 0,
    collected_revenue: 0,
    uncollected_revenue: 0,
    expiring_soon_count: 0,
    expired_count: 0,
  });

  // Modal / Drawer controls
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isAddVillageOpen, setIsAddVillageOpen] = useState(false);
  const [newVillageName, setNewVillageName] = useState('');
  
  // Landing Page & Login
  const [showLogin, setShowLogin] = useState(false);
  
  // Customer Billing History Drawer / Modal States
  const [historyCustomer, setHistoryCustomer] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyTransactions, setHistoryTransactions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Unified Message Action Drawer
  const [messageDrawerCustomer, setMessageDrawerCustomer] = useState(null);
  
  // Quick pay selection popup
  const [quickPayCustomer, setQuickPayCustomer] = useState(null);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaid, setFilterPaid] = useState('all');

  // Form States
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone_number: '',
    plan: '',
    price_override: '',
    activation_date: new Date().toISOString().split('T')[0],
    language_preference: 'OD',
    reminder_days_before: 2
  });

  const [newPlan, setNewPlan] = useState({
    name: '',
    price: '',
    duration_days: 30,
    channels: ''
  });

  const [customMsg, setCustomMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  // Native Embedded WhatsApp Gateway States
  const [gatewayStatus, setGatewayStatus] = useState('INITIALIZING');
  const [qrCode, setQrCode] = useState(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Login Screen States
  const [loginRole, setLoginRole] = useState('customer'); // 'customer' or 'admin'
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Settings Password Changer State
  const [changeOldPassword, setChangeOldPassword] = useState('');
  const [changeNewPassword, setChangeNewPassword] = useState('');

  // Customer Portal Password & Complaint States
  const [customerNewPassword, setCustomerNewPassword] = useState('');
  const [customerPasswordLoading, setCustomerPasswordLoading] = useState(false);
  const [complaintType, setComplaintType] = useState('ଟିଭି ଆସୁନି (TV aasuni)');
  const [complaintDetails, setComplaintDetails] = useState('');
  const [complaintImage, setComplaintImage] = useState(null);
  const [complaintImagePreview, setComplaintImagePreview] = useState(null);
  const [complaintLoading, setComplaintLoading] = useState(false);
  const [changeConfirmPassword, setChangeConfirmPassword] = useState('');
  const [changePasswordMsg, setChangePasswordMsg] = useState(null);

  // Customer Portal States
  const [customerData, setCustomerData] = useState(null);
  const [customerTransactions, setCustomerTransactions] = useState([]);
  const [loadingCustData, setLoadingCustData] = useState(false);

  // Sync session state to local storage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('mahalaxmi_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('mahalaxmi_session');
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, []);

  // Polling for Embedded WhatsApp Gateway Status
  useEffect(() => {
    let interval;
    const checkGatewayStatus = async () => {
      try {
        const res = await fetch(`${WHATSAPP_BASE}/status`);
        if (res.ok) {
          const data = await res.json();
          setGatewayStatus(data.status);
          if (data.status === 'QR_READY') {
            const qrRes = await fetch(`${WHATSAPP_BASE}/qr`);
            if (qrRes.ok) {
              const qrData = await qrRes.json();
              setQrCode(qrData.qr);
            }
          } else {
            setQrCode(null);
          }
        } else {
          setGatewayStatus('DISCONNECTED');
          setQrCode(null);
        }
      } catch (err) {
        setGatewayStatus('OFFLINE');
        setQrCode(null);
      }
    };

    checkGatewayStatus();
    interval = setInterval(checkGatewayStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Customer Portal specific data
  const fetchCustomerPortalData = async () => {
    if (!currentUser || currentUser.role !== 'customer') return;
    setLoadingCustData(true);
    
    if (isUsingMock || isNaN(currentUser.customerId) && currentUser.customerId.length > 20) {
      // Find latest mock customer
      const found = (customers.length ? customers : MOCK_CUSTOMERS).find(c => c.id === currentUser.customerId);
      if (found) {
        setCustomerData(found);
        setCustomerTransactions([
          { id: 't1', plan_name: found.plan_details?.name || 'Odia Basic Pack', amount: found.price_override || found.plan_details?.price || 220, payment_date: found.activation_date, expiry_date: found.expiry_date },
          { id: 't2', plan_name: found.plan_details?.name || 'Odia Basic Pack', amount: found.price_override || found.plan_details?.price || 220, payment_date: '2026-04-01', expiry_date: found.activation_date },
        ]);
      }
      setLoadingCustData(false);
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/customers/${currentUser.customerId}/`);
      if (res.ok) {
        const data = await res.json();
        setCustomerData(data);
        setCustomerTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch customer detail', err);
    } finally {
      setLoadingCustData(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.role === 'customer') {
      fetchCustomerPortalData();
    }
  }, [currentUser, customers]);

  const handleDisconnectGateway = async () => {
    if (!window.confirm('Are you sure you want to disconnect/logout the linked WhatsApp device?')) return;
    setIsDisconnecting(true);
    try {
      const res = await fetch(`${WHATSAPP_BASE}/logout`, { method: 'POST' });
      if (res.ok) {
        triggerAlert('WhatsApp device successfully logged out!', 'success');
      } else {
        const errData = await res.json();
        triggerAlert(`Logout failed: ${errData.error}`, 'error');
      }
    } catch (err) {
      triggerAlert('Failed to connect to gateway server for logout.', 'error');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const triggerAlert = (text, type = 'success') => {
    setAlertMsg({ text, type });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const fetchData = async () => {
    try {
      const planRes = await fetch(`${API_BASE}/plans/`);
      if (!planRes.ok) throw new Error('API Offline');
      
      const planData = await planRes.json();
      setPlans(planData);

      const custRes = await fetch(`${API_BASE}/customers/`);
      const custData = await custRes.json();
      setCustomers(custData);

      const logRes = await fetch(`${API_BASE}/logs/`);
      const logData = await logRes.json();
      setLogs(logData);

      const statsRes = await fetch(`${API_BASE}/customers/stats/`);
      const statsData = await statsRes.json();
      setStats(statsData);

      try {
        const villageRes = await fetch(`${API_BASE}/villages/`);
        if (villageRes.ok) {
          const villageData = await villageRes.json();
          setVillages(villageData);
        }
      } catch (_) {}

      setIsUsingMock(false);
    } catch (err) {
      console.warn("Backend API Offline. Falling back to premium local simulation mode.", err);
      setIsUsingMock(true);
      setPlans(MOCK_PLANS);
      setCustomers(MOCK_CUSTOMERS);
      setLogs(MOCK_LOGS);
      calculateMockStats(MOCK_CUSTOMERS);
    }
  };

  const calculateMockStats = (currentCustomers) => {
    const total = currentCustomers.length;
    const paid = currentCustomers.filter(c => c.is_paid).length;
    const unpaid = total - paid;
    
    let collected = 0;
    let uncollected = 0;
    
    currentCustomers.forEach(c => {
      const price = c.price_override ? parseFloat(c.price_override) : (c.plan_details ? parseFloat(c.plan_details.price) : 0);
      if (c.is_paid) collected += price;
      else uncollected += price;
    });

    const expiringSoon = currentCustomers.filter(c => c.days_left >= 0 && c.days_left <= 3 && c.is_paid).length;
    const expired = currentCustomers.filter(c => c.days_left < 0 && c.is_paid).length;

    setStats({
      total_customers: total,
      paid_customers: paid,
      unpaid_customers: unpaid,
      collected_revenue: collected,
      uncollected_revenue: uncollected,
      expiring_soon_count: expiringSoon,
      expired_count: expired
    });
  };

  // Perform Sign-in request
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    if (isUsingMock) {
      setTimeout(() => {
        setLoginLoading(false);
        if (loginRole === 'admin') {
          if (loginPassword === 'admin') {
            setCurrentUser({ role: 'admin', token: 'mock-admin-token' });
            triggerAlert('Logged in as Admin Console Operator');
          } else {
            setLoginError('Invalid credentials. Hint: default offline is "admin"');
          }
        } else {
          // Clean phone digits
          const cleanPhone = loginPhone.replace(/\D/g, '');
          const match = MOCK_CUSTOMERS.find(c => c.phone_number.replace(/\D/g, '').endsWith(cleanPhone) || cleanPhone.endsWith(c.phone_number.replace(/\D/g, '')));
          
          if (!match) {
            setLoginError('No matching customer phone number found.');
            return;
          }
          const cleanPhoneDigits = match.phone_number.replace(/\D/g, '');
          const defaultPassword = cleanPhoneDigits.slice(-4);
          
          if (loginPassword === defaultPassword) {
            setCurrentUser({
              role: 'customer',
              customerId: match.id,
              customer: match,
              token: `mock-customer-session-${match.id}`
            });
            triggerAlert(`Logged in as Customer: ${match.name}`);
          } else {
            setLoginError(`Invalid password. Default password is the last 4 digits of your phone: ${defaultPassword}`);
          }
        }
      }, 800);
      return;
    }

    try {
      const payload = { role: loginRole, password: loginPassword };
      if (loginRole === 'customer') {
        payload.phone_number = loginPhone;
      }

      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setLoginLoading(false);

      if (res.ok) {
        setCurrentUser(data);
        triggerAlert(loginRole === 'admin' ? 'Admin logged in successfully' : `Welcome, ${data.customer.name}!`);
      } else {
        setLoginError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setLoginLoading(false);
      console.warn("Backend login failed. Retrying in Mock Fallback mode.", err);
      // Fallback
      if (loginRole === 'admin') {
        if (loginPassword === 'admin') {
          setCurrentUser({ role: 'admin', token: 'mock-admin-token' });
          triggerAlert('Logged in as Admin Console Operator (Mock Fallback)');
        } else {
          setLoginError('Invalid credentials.');
        }
      } else {
        const cleanPhone = loginPhone.replace(/\D/g, '');
        const match = MOCK_CUSTOMERS.find(c => c.phone_number.replace(/\D/g, '').endsWith(cleanPhone));
        if (!match) {
          setLoginError('No customer record found.');
          return;
        }
        const defaultPassword = match.phone_number.replace(/\D/g, '').slice(-4);
        if (loginPassword === defaultPassword) {
          setCurrentUser({
            role: 'customer',
            customerId: match.id,
            customer: match,
            token: `mock-customer-session-${match.id}`
          });
        } else {
          setLoginError('Invalid password.');
        }
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginPhone('');
    setLoginPassword('');
    triggerAlert('Logged out successfully.');
  };

  const handleTogglePayment = (customer) => {
    if (customer.is_paid) {
      if (window.confirm(`Mark ${customer.name} as UNPAID?`)) {
        performMarkUnpaid(customer);
      }
    } else {
      setQuickPayCustomer(customer);
    }
  };

  const performMarkUnpaid = async (customer) => {
    if (isUsingMock) {
      const updated = customers.map(c => {
        if (c.id === customer.id) {
          return { ...c, is_paid: false, days_left: -1 };
        }
        return c;
      });
      setCustomers(updated);
      calculateMockStats(updated);
      triggerAlert(`Marked Unpaid for ${customer.name}`);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/customers/${customer.id}/mark_unpaid/`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        triggerAlert(data.message);
        fetchData();
      } else {
        triggerAlert(data.error || 'Operation failed', 'error');
      }
    } catch (err) {
      triggerAlert('Network error connecting to backend', 'error');
    }
  };

  const performMarkPaid = async (customer, style) => {
    setQuickPayCustomer(null);
    setIsSending(true);

    if (isUsingMock) {
      setTimeout(() => {
        setIsSending(false);
        const updated = customers.map(c => {
          if (c.id === customer.id) {
            const duration = c.plan_details?.duration_days || 30;
            const calculatedExpiry = calculateExpiryDateJS(new Date(), duration);
            return {
              ...c,
              is_paid: true,
              activation_date: new Date().toISOString().split('T')[0],
              expiry_date: calculatedExpiry,
              days_left: duration
            };
          }
          return c;
        });
        setCustomers(updated);
        calculateMockStats(updated);
        
        if (style !== 'none') {
          const text = customer.language_preference === 'OD'
            ? `ଧନ୍ୟବାଦ ${customer.name}! ଆପଣଙ୍କର Rs. ${customer.price_override || customer.plan_details?.price || 0} ର ପେମେଣ୍ଟ ମିଳିଗଲା। ପ୍ଲାନ ସଫଳତାର ସହ ନବୀକରଣ ହୋଇଛି।`
            : `Thank you ${customer.name}! Payment of Rs. ${customer.price_override || customer.plan_details?.price || 0} received. Subscription is successfully renewed!`;
          setLogs([{
            id: Date.now().toString(),
            customer_name: customer.name,
            message_type: 'RECEIPT',
            message_content: `[Receipt: ${style}] ` + text,
            language: customer.language_preference,
            sent_at: new Date().toISOString(),
            status: 'SENT'
          }, ...logs]);
          triggerAlert(`Marked Paid & Receipt message queued in background!`);
        } else {
          triggerAlert(`Marked Paid (No Notification) for ${customer.name}`);
        }
      }, 600);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/customers/${customer.id}/mark_paid/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_style: style })
      });
      const data = await res.json();
      setIsSending(false);
      if (res.ok) {
        triggerAlert(data.message);
        fetchData();
      } else {
        triggerAlert(data.error || 'Operation failed', 'error');
      }
    } catch (err) {
      setIsSending(false);
      triggerAlert('Network error connecting to backend', 'error');
    }
  };

  const handleSendReminder = async (customer, style) => {
    setIsSending(true);
    if (isUsingMock) {
      setTimeout(() => {
        setIsSending(false);
        const text = customer.language_preference === 'OD'
          ? `ପ୍ରିୟ ${customer.name}, ଆପଣଙ୍କର କେବୁଲ୍ ଟିଭି ପ୍ଲାନ ${customer.plan_details?.name} [${customer.expiry_date}] ରେ ଶେଷ ହେଉଛି। ଦୟାକରି Rs. ${customer.price_override || customer.plan_details?.price} ପ୍ରଦାନ କରନ୍ତୁ।`
          : `Dear ${customer.name}, your Cable TV plan ${customer.plan_details?.name} expires on [${customer.expiry_date}]. Please pay Rs. ${customer.price_override || customer.plan_details?.price} to avoid interruption.`;
        
        setLogs([{
          id: Date.now().toString(),
          customer_name: customer.name,
          message_type: 'REMINDER',
          message_content: `[Reminder: ${style}] ` + text,
          language: customer.language_preference,
          sent_at: new Date().toISOString(),
          status: 'SENT'
        }, ...logs]);
        setMessageDrawerCustomer(null);
        triggerAlert(`Reminder (${style}) successfully enqueued in background queue!`);
      }, 500);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/customers/${customer.id}/send_reminder/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_style: style })
      });
      const data = await res.json();
      setIsSending(false);
      if (res.ok) {
        triggerAlert(`Reminder successfully enqueued in background!`);
        setMessageDrawerCustomer(null);
        fetchData();
      } else {
        triggerAlert(data.message || 'Failed to queue reminder', 'error');
      }
    } catch (err) {
      setIsSending(false);
      triggerAlert('Network error', 'error');
    }
  };

  const handleSendCustomMessage = async (e) => {
    e.preventDefault();
    if (!customMsg.trim()) return;
    setIsSending(true);

    if (isUsingMock) {
      setTimeout(() => {
        setIsSending(false);
        setLogs([{
          id: Date.now().toString(),
          customer_name: messageDrawerCustomer.name,
          message_type: 'CUSTOM',
          message_content: customMsg,
          language: messageDrawerCustomer.language_preference,
          sent_at: new Date().toISOString(),
          status: 'SENT'
        }, ...logs]);
        setCustomMsg('');
        setMessageDrawerCustomer(null);
        triggerAlert(`Custom WhatsApp message enqueued!`);
      }, 500);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/customers/${messageDrawerCustomer.id}/send_custom_message/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: customMsg })
      });
      const data = await res.json();
      setIsSending(false);
      if (res.ok) {
        triggerAlert('Custom message queued in background!');
        setCustomMsg('');
        setMessageDrawerCustomer(null);
        fetchData();
      } else {
        triggerAlert(data.error || 'Failed to queue message', 'error');
      }
    } catch (err) {
      setIsSending(false);
      triggerAlert('Network error', 'error');
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!newPlan.name || !newPlan.price) return;

    if (isUsingMock) {
      const newlyCreated = {
        id: Date.now().toString(),
        name: newPlan.name,
        price: parseFloat(newPlan.price),
        duration_days: parseInt(newPlan.duration_days),
        channels: newPlan.channels || ''
      };
      setPlans([newlyCreated, ...plans]);
      setNewPlan({ name: '', price: '', duration_days: 30, channels: '' });
      setIsAddPlanOpen(false);
      triggerAlert(`Plan "${newlyCreated.name}" added successfully!`);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/plans/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlan)
      });
      if (res.ok) {
        triggerAlert('Plan created successfully!');
        setNewPlan({ name: '', price: '', duration_days: 30, channels: '' });
        setIsAddPlanOpen(false);
        fetchData();
      } else {
        triggerAlert('Failed to create plan', 'error');
      }
    } catch (err) {
      triggerAlert('Network error', 'error');
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.activation_date) return;

    let formattedPhone = null;
    if (newCustomer.phone_number && newCustomer.phone_number.trim()) {
      const trimmedPhone = newCustomer.phone_number.trim();
      let digits = trimmedPhone.replace(/\D/g, '');
      if (digits.length === 10) {
        formattedPhone = `+91${digits}`;
      } else if (digits.length === 12 && digits.startsWith('91')) {
        formattedPhone = `+${digits}`;
      } else if (!trimmedPhone.startsWith('+')) {
        formattedPhone = `+${digits}`;
      } else {
        formattedPhone = trimmedPhone;
      }
    }

    if (isUsingMock) {
      const selectedPlanDetails = plans.find(p => p.id === newCustomer.plan);
      const duration = selectedPlanDetails?.duration_days || 30;
      const calculatedExpiry = calculateExpiryDateJS(newCustomer.activation_date, duration);

      const newlyCreated = {
        id: Date.now().toString(),
        name: newCustomer.name,
        phone_number: formattedPhone,
        password: newCustomer.password || null,
        plan: newCustomer.plan,
        plan_details: selectedPlanDetails || null,
        price_override: newCustomer.price_override ? parseFloat(newCustomer.price_override) : null,
        activation_date: newCustomer.activation_date,
        expiry_date: calculatedExpiry,
        is_paid: true,
        language_preference: newCustomer.language_preference,
        reminder_days_before: parseInt(newCustomer.reminder_days_before),
        days_left: selectedPlanDetails?.duration_days || 30
      };

      const updated = [newlyCreated, ...customers];
      setCustomers(updated);
      calculateMockStats(updated);
      setNewCustomer({
        name: '',
        phone_number: '',
        password: '',
        plan: '',
        price_override: '',
        activation_date: new Date().toISOString().split('T')[0],
        language_preference: 'OD',
        reminder_days_before: 2
      });
      setIsAddCustomerOpen(false);
      triggerAlert(`Customer "${newlyCreated.name}" added successfully!`);
      return;
    }

    try {
      const payload = {
        ...newCustomer,
        phone_number: formattedPhone,
        password: newCustomer.password === '' ? null : newCustomer.password,
        price_override: newCustomer.price_override === '' ? null : newCustomer.price_override,
        plan: newCustomer.plan === '' ? null : newCustomer.plan,
        village: newCustomer.village === '' || newCustomer.village == null ? null : newCustomer.village,
        setup_box_number: newCustomer.setup_box_number === '' ? null : newCustomer.setup_box_number,
        setup_box_brand: newCustomer.setup_box_brand === '' ? null : newCustomer.setup_box_brand,
      };

      const res = await fetch(`${API_BASE}/customers/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        triggerAlert('Customer added successfully!');
        setNewCustomer({
          name: '',
          phone_number: '',
          password: '',
          plan: '',
          village: null,
          setup_box_number: '',
          setup_box_brand: '',
          price_override: '',
          activation_date: new Date().toISOString().split('T')[0],
          language_preference: 'OD',
          reminder_days_before: 2
        });
        setIsAddCustomerOpen(false);
        fetchData();
      } else {
        triggerAlert('Failed to add customer', 'error');
      }
    } catch (err) {
      triggerAlert('Network error', 'error');
    }
  };

  const handleEditCustomer = async (e) => {
    e.preventDefault();
    if (!editingCustomer.name) return;

    let formattedPhone = null;
    if (editingCustomer.phone_number && editingCustomer.phone_number.trim()) {
      const trimmedPhone = editingCustomer.phone_number.trim();
      let digits = trimmedPhone.replace(/\D/g, '');
      if (digits.length === 10) {
        formattedPhone = `+91${digits}`;
      } else if (digits.length === 12 && digits.startsWith('91')) {
        formattedPhone = `+${digits}`;
      } else if (!trimmedPhone.startsWith('+')) {
        formattedPhone = `+${digits}`;
      } else {
        formattedPhone = trimmedPhone;
      }
    }

    if (isUsingMock) {
      const selectedPlanDetails = plans.find(p => p.id === editingCustomer.plan);
      const updated = customers.map(c => {
        if (c.id === editingCustomer.id) {
          return {
            ...c,
            ...editingCustomer,
            phone_number: formattedPhone,
            plan_details: selectedPlanDetails || null,
            days_left: editingCustomer.expiry_date 
              ? Math.ceil((new Date(editingCustomer.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
              : 0
          };
        }
        return c;
      });
      setCustomers(updated);
      calculateMockStats(updated);
      setIsEditCustomerOpen(false);
      setEditingCustomer(null);
      triggerAlert("Customer updated successfully!");
      return;
    }

    try {
      const payload = {
        name: editingCustomer.name,
        phone_number: formattedPhone,
        password: editingCustomer.password === '' || editingCustomer.password === null ? null : editingCustomer.password,
        plan: editingCustomer.plan === '' ? null : editingCustomer.plan,
        village: editingCustomer.village === '' || editingCustomer.village == null ? null : editingCustomer.village,
        setup_box_number: editingCustomer.setup_box_number === '' ? null : editingCustomer.setup_box_number,
        setup_box_brand: editingCustomer.setup_box_brand === '' ? null : editingCustomer.setup_box_brand,
        price_override: editingCustomer.price_override === '' || editingCustomer.price_override === null ? null : editingCustomer.price_override,
        activation_date: editingCustomer.activation_date,
        expiry_date: editingCustomer.expiry_date,
        is_paid: editingCustomer.is_paid,
        language_preference: editingCustomer.language_preference,
        reminder_days_before: parseInt(editingCustomer.reminder_days_before)
      };

      const res = await fetch(`${API_BASE}/customers/${editingCustomer.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        triggerAlert('Customer updated successfully!');
        setIsEditCustomerOpen(false);
        setEditingCustomer(null);
        fetchData();
      } else {
        const errData = await res.json();
        triggerAlert(errData.error || 'Failed to update customer', 'error');
      }
    } catch (err) {
      triggerAlert('Network error', 'error');
    }
  };

  const handleDeleteCustomer = async (customer) => {
    if (!window.confirm(`Are you sure you want to delete customer "${customer.name}"? This action cannot be undone.`)) return;

    if (isUsingMock) {
      const updated = customers.filter(c => c.id !== customer.id);
      setCustomers(updated);
      calculateMockStats(updated);
      triggerAlert(`Customer "${customer.name}" deleted!`);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/customers/${customer.id}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        triggerAlert('Customer record deleted.');
        fetchData();
      } else {
        triggerAlert('Failed to delete customer record', 'error');
      }
    } catch (err) {
      triggerAlert('Network error', 'error');
    }
  };

  const handleOpenHistory = async (customer) => {
    setHistoryCustomer(customer);
    setIsHistoryOpen(true);
    setLoadingHistory(true);
    setHistoryTransactions([]);

    if (isUsingMock) {
      setTimeout(() => {
        setHistoryTransactions([
          { id: 't1', plan_name: customer.plan_details?.name || 'BASIC', amount: customer.price_override || customer.plan_details?.price || 180, payment_date: customer.activation_date, expiry_date: customer.expiry_date },
          { id: 't2', plan_name: customer.plan_details?.name || 'BASIC', amount: customer.price_override || customer.plan_details?.price || 180, payment_date: '2026-04-18', expiry_date: customer.activation_date },
        ]);
        setLoadingHistory(false);
      }, 500);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/customers/${customer.id}/transactions/`);
      if (res.ok) {
        const data = await res.json();
        setHistoryTransactions(data);
      }
    } catch (err) {
      console.error("Failed to fetch billing history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCustomerChangePassword = async (e, customerId) => {
    e.preventDefault();
    if (!customerNewPassword.trim()) {
      triggerAlert('Password cannot be empty', 'error');
      return;
    }
    setCustomerPasswordLoading(true);

    if (isUsingMock) {
      setTimeout(() => {
        setCustomerPasswordLoading(false);
        setCustomerNewPassword('');
        triggerAlert('Password changed successfully (Mock Mode)!');
      }, 500);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/customers/${customerId}/change_password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: customerNewPassword })
      });
      const data = await res.json();
      setCustomerPasswordLoading(false);
      if (res.ok) {
        setCustomerNewPassword('');
        triggerAlert(data.message || 'Password successfully changed!');
      } else {
        triggerAlert(data.error || 'Failed to update password', 'error');
      }
    } catch (err) {
      setCustomerPasswordLoading(false);
      triggerAlert('Network error updating password', 'error');
    }
  };

  const handleCustomerSubmitComplaint = async (e, customerId) => {
    e.preventDefault();
    setComplaintLoading(true);

    if (isUsingMock) {
      setTimeout(() => {
        setComplaintLoading(false);
        setComplaintDetails('');
        setComplaintImage(null);
        setComplaintImagePreview(null);
        triggerAlert('Complaint submitted successfully (Mock Mode)!');
      }, 800);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('problem_type', complaintType);
      formData.append('details', complaintDetails);
      if (complaintImage) {
        formData.append('image', complaintImage);
      }

      const res = await fetch(`${API_BASE}/customers/${customerId}/file_complaint/`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setComplaintLoading(false);
      if (res.ok) {
        setComplaintDetails('');
        setComplaintImage(null);
        setComplaintImagePreview(null);
        triggerAlert(data.message || 'Complaint submitted successfully!');
      } else {
        triggerAlert(data.error || 'Failed to submit complaint', 'error');
      }
    } catch (err) {
      setComplaintLoading(false);
      triggerAlert('Network error submitting complaint', 'error');
    }
  };

  const handleDeletePlan = async (plan) => {
    if (!window.confirm(`Delete billing plan "${plan.name}"? This might affect customers on this plan.`)) return;

    if (isUsingMock) {
      setPlans(plans.filter(p => p.id !== plan.id));
      triggerAlert(`Plan "${plan.name}" deleted.`);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/plans/${plan.id}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        triggerAlert('Billing package deleted.');
        fetchData();
      } else {
        triggerAlert('Failed to delete billing package.', 'error');
      }
    } catch (err) {
      triggerAlert('Network error', 'error');
    }
  };

  const handleCreateVillage = async (e) => {
    e.preventDefault();
    if (!newVillageName.trim()) return;
    if (isUsingMock) {
      setVillages([{ id: Date.now().toString(), name: newVillageName }, ...villages]);
      setNewVillageName('');
      setIsAddVillageOpen(false);
      triggerAlert(`Village "${newVillageName}" added!`);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/villages/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newVillageName })
      });
      if (res.ok) {
        triggerAlert(`Village "${newVillageName}" created!`);
        setNewVillageName('');
        setIsAddVillageOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        triggerAlert(err.name?.[0] || 'Failed to create village', 'error');
      }
    } catch (err) {
      triggerAlert('Network error', 'error');
    }
  };

  const handleDeleteVillage = async (village) => {
    if (!window.confirm(`Delete village "${village.name}"?`)) return;
    if (isUsingMock) {
      setVillages(villages.filter(v => v.id !== village.id));
      triggerAlert(`Village "${village.name}" deleted.`);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/villages/${village.id}/`, { method: 'DELETE' });
      if (res.ok) {
        triggerAlert('Village deleted.');
        fetchData();
      } else {
        triggerAlert('Failed to delete village.', 'error');
      }
    } catch (err) {
      triggerAlert('Network error', 'error');
    }
  };

  const handleDeleteLog = async (log) => {
    if (!window.confirm('Delete this WhatsApp delivery log entry?')) return;

    if (isUsingMock) {
      setLogs(logs.filter(l => l.id !== log.id));
      triggerAlert('Log entry removed.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/logs/${log.id}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        triggerAlert('Log entry deleted.');
        fetchData();
      } else {
        triggerAlert('Failed to delete log entry.', 'error');
      }
    } catch (err) {
      triggerAlert('Network error', 'error');
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setChangePasswordMsg(null);

    if (changeNewPassword !== changeConfirmPassword) {
      setChangePasswordMsg({ text: 'New passwords do not match!', type: 'error' });
      return;
    }

    if (isUsingMock) {
      setTimeout(() => {
        setChangePasswordMsg({ text: 'Password successfully updated (Offline Simulation)!', type: 'success' });
        setChangeOldPassword('');
        setChangeNewPassword('');
        setChangeConfirmPassword('');
      }, 500);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/change_password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_password: changeOldPassword,
          new_password: changeNewPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setChangePasswordMsg({ text: 'Admin password updated successfully!', type: 'success' });
        setChangeOldPassword('');
        setChangeNewPassword('');
        setChangeConfirmPassword('');
      } else {
        setChangePasswordMsg({ text: data.error || 'Failed to update password', type: 'error' });
      }
    } catch (err) {
      setChangePasswordMsg({ text: 'Network error communicating with backend', type: 'error' });
    }
  };

  const displayPhone = (phone) => {
    if (!phone) return '';
    const clean = phone.replace('+91', '').trim();
    if (clean.length === 10) {
      return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
    }
    return phone;
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.phone_number || '').includes(searchQuery);
    
    if (filterPaid === 'paid') return matchesSearch && c.is_paid;
    if (filterPaid === 'unpaid') return matchesSearch && !c.is_paid;
    return matchesSearch;
  });

  // ==========================================
  // VIEW: AUTHENTICATION LOGIN PANEL & LANDING PAGE
  // ==========================================
  if (!currentUser) {
    if (!showLogin) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl shadow-md">
                  <Tv className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">Mahalaxmi Network</h1>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Premium Cable Services</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => { setLoginRole('admin'); setShowLogin(true); }}
                  className="hidden sm:block text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Admin Portal
                </button>
                <button 
                  onClick={() => { setLoginRole('customer'); setShowLogin(true); }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-extrabold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  Customer Login
                </button>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <main className="flex-grow flex flex-col items-center justify-center px-4 py-20 text-center relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-full max-h-[600px] bg-gradient-to-tr from-blue-100/40 to-indigo-50/40 rounded-full blur-3xl -z-10"></div>
            
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold mb-8 animate-fadeIn">
              <Star className="h-3.5 w-3.5" /> Trusted by 5000+ Customers
            </div>
            
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight animate-slideUp">
              Your Ultimate <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Digital Entertainment</span> Experience
            </h2>
            
            <p className="mt-6 text-lg sm:text-xl text-slate-500 font-medium max-w-2xl mx-auto animate-slideUp" style={{ animationDelay: '100ms' }}>
              High-definition channels, seamless connectivity, and transparent billing. Manage your subscriptions directly from our intuitive customer portal.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 animate-slideUp" style={{ animationDelay: '200ms' }}>
              <button 
                onClick={() => { setLoginRole('customer'); setShowLogin(true); }}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base font-extrabold rounded-2xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
              >
                Access Customer Portal <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto w-full animate-fadeIn" style={{ animationDelay: '400ms' }}>
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-all">
                <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 mb-5">
                  <Tv className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">HD Channels</h3>
                <p className="text-sm text-slate-500 font-medium">Crystal clear picture quality with 500+ premium and regional channels.</p>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-all">
                <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 mb-5">
                  <Shield className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">Secure Billing</h3>
                <p className="text-sm text-slate-500 font-medium">View receipts, track your plans, and make hassle-free renewals online.</p>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-all">
                <div className="p-4 bg-amber-50 rounded-2xl text-amber-600 mb-5">
                  <HeadphonesIcon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">24/7 Support</h3>
                <p className="text-sm text-slate-500 font-medium">Quick complaint resolution directly through our automated WhatsApp gateway.</p>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="bg-slate-950 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-900">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl shadow-md">
                    <Tv className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="text-lg font-black text-white tracking-tight">Mahalaxmi Network</h4>
                </div>
                <p className="text-xs font-medium text-slate-500 max-w-xs leading-relaxed">
                  Providing premium digital cable services and un-interrupted entertainment to thousands of households.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Contact Info</h4>
                <ul className="space-y-3 text-sm font-medium">
                  <li className="flex items-start gap-3">
                    <Phone className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                    <div>
                      <p>LAXMIDHARA SAHOO</p>
                      <a href="tel:+919777546420" className="hover:text-blue-400 transition-colors">+91 9777546420</a>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Mail className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                    <a href="mailto:amareshasahoo@gmail.com" className="hover:text-blue-400 transition-colors">amareshasahoo@gmail.com</a>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                    <p>Siaria, Siaria Bada Sahi, 754037</p>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Portals</h4>
                <ul className="space-y-2 text-sm font-medium">
                  <li><button onClick={() => { setLoginRole('customer'); setShowLogin(true); }} className="hover:text-blue-400 transition-colors cursor-pointer">Customer Login</button></li>
                  <li><button onClick={() => { setLoginRole('admin'); setShowLogin(true); }} className="hover:text-blue-400 transition-colors cursor-pointer">Administrator Panel</button></li>
                </ul>
              </div>
            </div>
            <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-800 text-center flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold">
              <p>© 2026 Mahalaxmi Network. All Rights Reserved.</p>
              <p>Designed & Developed with precision.</p>
            </div>
          </footer>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 antialiased font-sans relative">
        <button 
          onClick={() => setShowLogin(false)}
          className="absolute top-6 left-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-300 transition-all cursor-pointer backdrop-blur-md border border-white/10"
          title="Back to Home"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 animate-scaleUp">
          <div className="text-center mb-6">
            <div className="inline-flex bg-gradient-to-tr from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20 mb-3">
              <Smartphone className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Mahalaxmi Network</h1>
            <p className="text-xs text-slate-300 font-medium mt-1">ମହାଲକ୍ଷ୍ମୀ ନେଟୱର୍କ - Secure Billing Portal</p>
          </div>

          {/* Toggle Role Selector */}
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => { setLoginRole('customer'); setLoginError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginRole === 'customer' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Customer Billing
            </button>
            <button
              type="button"
              onClick={() => { setLoginRole('admin'); setLoginError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginRole === 'admin' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              Admin Console
            </button>
          </div>

          {loginError && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-bold p-3.5 rounded-xl mb-4.5 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            {loginRole === 'customer' ? (
              <>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-300 mb-1.5">
                    Registered Mobile Number
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="E.g. 7894376226"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-400 font-semibold rounded-xl pl-10 pr-4 py-3.5 text-sm focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-300 mb-1.5">
                    Secret Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="Default: last 4 digits of phone"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-400 font-semibold rounded-xl pl-10 pr-4 py-3.5 text-sm focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block font-bold">Default password is the last 4 digits of your phone number.</span>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-300 mb-1.5">
                  Console Operator Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Enter password (default: admin)"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-400 font-semibold rounded-xl pl-10 pr-4 py-3.5 text-sm focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-4.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-98 disabled:opacity-50 text-white text-xs font-black tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loginLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Authenticating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Sign In to Account
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: BESPOKE CUSTOMER PORTAL DASHBOARD
  // ==========================================
  if (currentUser.role === 'customer') {
    const activeCustomer = customerData || currentUser.customer || {};
    const price = activeCustomer.price_override 
      ? parseFloat(activeCustomer.price_override) 
      : (activeCustomer.plan_details ? parseFloat(activeCustomer.plan_details.price) : 0);
    
    // Dynamic UPI Payment QR code url
    const upiUri = `upi://pay?pa=9777547420@ybl&pn=Mahalaxmi Network&am=${price}&cu=INR`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;

    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col antialiased">
        <header className="glass sticky top-0 z-40 border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-2xl shadow-md">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">Mahalaxmi Network</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ସେବା ହିଁ ଆମର ଲକ୍ଷ୍ୟ</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log Out
          </button>
        </header>

        <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
          {/* Branded welcome banner */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col gap-1.5 border border-indigo-900">
            <div className="absolute right-0 bottom-0 opacity-15 translate-x-12 translate-y-12">
              <Globe className="h-44 w-44" />
            </div>
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-blue-300">Customer Bill Details</span>
            <h2 className="text-xl sm:text-2xl font-black">{activeCustomer.name}</h2>
            <p className="text-xs text-slate-300 font-semibold">{displayPhone(activeCustomer.phone_number)}</p>
          </div>

          {loadingCustData ? (
            <div className="glass-card p-12 rounded-2xl border border-slate-200 bg-white text-center flex flex-col items-center justify-center">
              <div className="h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <span className="text-xs font-bold text-slate-500">Syncing subscription accounts...</span>
            </div>
          ) : (
            <>
              {/* Plan Statistics Overview */}
              <section className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Plan Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`h-2.5 w-2.5 rounded-full ${activeCustomer.is_paid ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></span>
                    <h3 className={`text-base font-extrabold ${activeCustomer.is_paid ? 'text-emerald-600' : 'text-red-600'}`}>
                      {activeCustomer.is_paid ? 'ACTIVE (PAID)' : 'SUSPENDED (UNPAID)'}
                    </h3>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                    Package: {activeCustomer.plan_details?.name || 'Active Package'}
                  </p>
                </div>

                <div className="glass-card p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Days Remaining</p>
                    <h3 className={`text-xl sm:text-2xl font-black mt-0.5 ${
                      activeCustomer.is_paid && activeCustomer.days_left > 3 
                        ? 'text-emerald-600' 
                        : activeCustomer.is_paid && activeCustomer.days_left >= 0 
                        ? 'text-amber-500 animate-pulse' 
                        : 'text-red-500'
                    }`}>
                      {activeCustomer.is_paid ? `${activeCustomer.days_left} Days Left` : 'Expired'}
                    </h3>
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    Expiry Date: {activeCustomer.expiry_date || 'N/A'}
                  </p>
                </div>
              </section>

              {/* Equipment / Setup Box Info Card */}
              {(activeCustomer.setup_box_number || activeCustomer.setup_box_brand || activeCustomer.village_details) && (
                <section className="glass-card p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                      <Box className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Equipment & Location</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {activeCustomer.village_details && (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> Service Area
                        </p>
                        <p className="font-extrabold text-slate-800 text-sm mt-0.5">{activeCustomer.village_details.name}</p>
                      </div>
                    )}
                    {activeCustomer.setup_box_brand && (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Tv className="h-3 w-3" /> Setup Box Brand
                        </p>
                        <p className="font-extrabold text-slate-800 text-sm mt-0.5">{activeCustomer.setup_box_brand}</p>
                      </div>
                    )}
                    {activeCustomer.setup_box_number && (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Wifi className="h-3 w-3" /> Device Serial
                        </p>
                        <p className="font-extrabold text-slate-800 text-sm mt-0.5 font-mono">{activeCustomer.setup_box_number}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Channel list grid (shown if plan has channels configured) */}
              {activeCustomer.plan_details?.channels && activeCustomer.plan_details.channels.trim() && (
                <section className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                      <Star className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                      Your Channel Package — {activeCustomer.plan_details.name}
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {activeCustomer.plan_details.channels.split(',').map((ch, idx) => ch.trim() && (
                      <div key={idx} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0"></div>
                        <span className="text-xs font-bold text-slate-700 truncate">{ch.trim()}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Dynamic scan to pay box if suspended / unpaid */}
              {!activeCustomer.is_paid && (
                <section className="glass-card p-6 rounded-3xl bg-red-50/50 border border-red-200 shadow-sm flex flex-col items-center text-center gap-4">
                  <div className="max-w-md">
                    <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <h3 className="text-base font-black text-slate-900">Immediate Action Required</h3>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1">
                      Your cable connection is currently unpaid. Scan this UPI QR code using any UPI app (GPay, PhonePe, BHIM, Paytm) to instantly pay <strong className="text-red-600">₹{price}</strong> to reactivate.
                    </p>
                  </div>

                  <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm inline-block">
                    <img 
                      src={qrUrl} 
                      alt="UPI Payment QR Code"
                      className="w-[180px] h-[180px] select-none mx-auto" 
                    />
                  </div>

                  <div>
                    <div className="text-xs font-black text-slate-800">UPI ID: 9777547420@ybl</div>
                    <div className="text-[10px] text-slate-400 font-bold mt-1">Scan and pay exact amount to Mahalaxmi Network.</div>
                  </div>
                </section>
              )}

              {/* Historical accounting transactions ledger */}
              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wider">Accounting Payment Ledger</h3>
                
                <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          <th className="px-5 py-3.5">Payment Date</th>
                          <th className="px-5 py-3.5">Package</th>
                          <th className="px-5 py-3.5 text-right">Amount</th>
                          <th className="px-5 py-3.5 text-right">Expiry Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs font-bold">
                        {customerTransactions.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="px-5 py-8 text-center text-slate-400 font-semibold">
                              No payment logs recorded in the ledger yet.
                            </td>
                          </tr>
                        ) : (
                          customerTransactions.map(tx => (
                            <tr key={tx.id} className="hover:bg-slate-50/50 bg-white transition-colors">
                              <td className="px-5 py-3.5 text-slate-900">{tx.payment_date}</td>
                              <td className="px-5 py-3.5 text-slate-500">{tx.plan_name}</td>
                              <td className="px-5 py-3.5 text-right text-emerald-600 font-extrabold">₹{tx.amount}</td>
                              <td className="px-5 py-3.5 text-right text-slate-700 font-medium">{tx.expiry_date}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* PDF statement image download */}
              <section className="mt-2.5">
                <a
                  href={`${API_BASE}/customers/${activeCustomer.id}/history_image/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-xs tracking-wider uppercase shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Download className="h-4.5 w-4.5" />
                  Download Premium History Image
                </a>
                <p className="text-[10px] text-slate-400 font-bold text-center mt-2.5 leading-relaxed">
                  Downloads a curated, branded image receipt of your last 7 statement logs for personal file records.
                </p>
              </section>

              {/* Contact Details & Direct Call dial card */}
              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wider">Contact Operator</h3>
                <div className="glass-card p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <h4 className="font-extrabold text-slate-900 text-sm">ଲକ୍ଷ୍ମୀଧର ସାହୁ / LAXMIDHARA SAHOO</h4>
                    <p className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider">Founder & Chief Operator</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-slate-600">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-blue-600 shrink-0" />
                      <span>+91 9777546420</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                      <span>amareshasahoo@gmail.com</span>
                    </div>
                    <div className="flex items-start gap-2 sm:col-span-2">
                      <MapPin className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>Siaria, Siaria Bada Sahi, 754037</span>
                    </div>
                  </div>
                  <a
                    href="tel:+919777546420"
                    className="mt-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black tracking-wider uppercase shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <Phone className="h-4 w-4 animate-bounce" />
                    Direct Call / Call Now
                  </a>
                </div>
              </section>

              {/* Professional Complaint & Help System */}
              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wider">Help Desk / ଟିଭି ସମସ୍ୟା ସମାଧାନ</h3>
                <form onSubmit={(e) => handleCustomerSubmitComplaint(e, activeCustomer.id)} className="glass-card p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Select Common Problem / ସମସ୍ୟା ବାଛନ୍ତୁ</label>
                    <select
                      value={complaintType}
                      onChange={(e) => setComplaintType(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="ଟିଭି ଆସୁନି (TV aasuni / No TV Picture)">ଟିଭି ଆସୁନି (TV aasuni / No TV Picture)</option>
                      <option value="ଟିଭି ଓପନ ହେଉନି (TV open hauni / TV Not Turning On)">ଟିଭି ଓପନ ହେଉନି (TV open hauni / TV Not Turning On)</option>
                      <option value="ସେଟଅପ୍ ବକ୍ସ ଖରାପ ହୋଇଗଲା (Setup box kharap heigala / Setup Box Damaged)">ସେଟଅପ୍ ବକ୍ସ ଖରାପ ହୋଇଗଲା (Setup box kharap heigala)</option>
                      <option value="ରିମୋଟ୍ ଖରାପ ହୋଇଗଲା (Remote kharap heigala / Remote Not Working)">ରିମୋଟ୍ ଖରାପ ହୋଇଗଲା (Remote kharap heigala)</option>
                      <option value="ସେଟଅପ୍ ବକ୍ସରେ ଲାଲ୍ ଲାଇଟ୍ ଜଳୁଛି (Setupbox red light jaluchi / Red Light on Setup Box)">ସେଟଅପ୍ ବକ୍ସରେ ଲାଲ୍ ଲାଇଟ୍ ଜଳୁଛି (Setupbox red light jaluchi)</option>
                      <option value="ନୋ ସିଗନାଲ୍ ଦେଖାଉଛି (No signal dekhauchi / No Signal Error)">ନୋ ସିଗନାଲ୍ ଦେଖାଉଛି (No signal dekhauchi)</option>
                      <option value="ଅନ୍ୟାନ୍ୟ ସମସ୍ୟା (Other Issue)">ଅନ୍ୟାନ୍ୟ ସମସ୍ୟା (Other Issue)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Describe Problem Detail / ସବିଶେଷ ବିବରଣୀ ଲେଖନ୍ତୁ</label>
                    <textarea
                      value={complaintDetails}
                      onChange={(e) => setComplaintDetails(e.target.value)}
                      placeholder="ସମସ୍ୟା ବିଷୟରେ କିଛି ଲେଖନ୍ତୁ (E.g. Since morning setup box is showing red light, remote is not responding, etc.)"
                      className="w-full px-4 py-3 border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all min-h-[80px]"
                    ></textarea>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Upload Error Photo / ଟିଭି କିମ୍ବା ବକ୍ସର ଫଟୋ ଅପଲୋଡ୍ କରନ୍ତୁ</label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Open Camera / File Input Trigger */}
                        <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-black rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm">
                          <Camera className="h-4 w-4" />
                          Take Photo
                          <input
                            type="file"
                            accept="image/*"
                            capture="user"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                setComplaintImage(file);
                                setComplaintImagePreview(URL.createObjectURL(file));
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                        <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-black rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm">
                          <Upload className="h-4 w-4" />
                          Select Image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                setComplaintImage(file);
                                setComplaintImagePreview(URL.createObjectURL(file));
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {complaintImagePreview && (
                        <div className="relative border border-slate-200 rounded-xl overflow-hidden h-14 w-14 shrink-0 bg-slate-100">
                          <img src={complaintImagePreview} alt="Attached Preview" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setComplaintImage(null);
                              setComplaintImagePreview(null);
                            }}
                            className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white rounded-bl-lg p-0.5 transition-colors cursor-pointer border-none flex items-center justify-center"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                        {complaintImage ? `Attached: ${complaintImage.name}` : "No photo attached yet. Open camera or select a photo of the TV error."}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={complaintLoading}
                    className="py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-400 text-white rounded-xl text-xs font-black tracking-wider uppercase shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {complaintLoading ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Submitting Ticket...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Submit Support Ticket / ସମସ୍ୟା ଜଣାନ୍ତୁ
                      </>
                    )}
                  </button>
                </form>
              </section>

              {/* Portal Access Security changes */}
              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wider">Change Login Password</h3>
                <form onSubmit={(e) => handleCustomerChangePassword(e, activeCustomer.id)} className="glass-card p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-end gap-3">
                  <div className="flex-1 w-full flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Enter New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        value={customerNewPassword}
                        onChange={(e) => setCustomerNewPassword(e.target.value)}
                        placeholder="Enter your customized secure portal password"
                        className="w-full pl-9 pr-4 py-3 border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={customerPasswordLoading}
                    className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl text-xs font-black tracking-wider uppercase shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] shrink-0"
                  >
                    {customerPasswordLoading ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      "Save Password"
                    )}
                  </button>
                </form>
              </section>
            </>
          )}
        </main>

        <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-[10px] font-bold tracking-wider text-slate-500">
          © 2026 Mahalaxmi Network. All Rights Reserved.
        </footer>
      </div>
    );
  }

  // ==========================================
  // VIEW: ADMIN OPERATOR CONSOLE VIEW (Original + updates)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col antialiased">
      {/* Dynamic Alerts */}
      {alertMsg && (
        <div className={`fixed bottom-5 right-5 px-5 py-4 rounded-2xl shadow-xl transition-all duration-300 transform translate-y-0 z-50 border flex items-center gap-3 ${
          alertMsg.type === 'error' 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className={`h-2.5 w-2.5 rounded-full ${alertMsg.type === 'error' ? 'bg-red-500 animate-ping' : 'bg-emerald-500 animate-ping'}`}></div>
          <span className="font-semibold text-sm">{alertMsg.text}</span>
        </div>
      )}

      {/* Premium Elegant Header */}
      <header className="glass sticky top-0 z-40 border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-2xl shadow-md shadow-blue-500/20">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Mahalaxmi Network
            </h1>
            <p className="text-xs text-slate-500 font-semibold">Operator Console Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status Indicator */}
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
            isUsingMock 
              ? 'bg-amber-50 border-amber-200 text-amber-800' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <span className={`h-2 w-2 rounded-full ${isUsingMock ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
            <span className="hidden sm:inline">{isUsingMock ? 'Offline Simulation (Mock Active)' : 'Aiven Cloud Sync Active'}</span>
            <span className="sm:hidden">{isUsingMock ? 'Simulation' : 'Cloud Sync'}</span>
          </div>

          <button 
            onClick={fetchData} 
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 border border-slate-200"
            title="Refresh Database"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            onClick={handleLogout}
            className="px-3.5 py-2.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 active:scale-95 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Metric Overview Panels */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4 sm:p-5 rounded-2xl flex items-center justify-between group hover:border-blue-300 transition-all duration-300">
            <div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Total Customers</p>
              <h3 className="text-xl sm:text-3xl font-extrabold mt-1 text-slate-900">{stats.total_customers}</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1 font-semibold">{stats.paid_customers} Paid &bull; {stats.unpaid_customers} Unpaid</p>
            </div>
            <div className="p-2.5 sm:p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </div>

          <div className="glass-card p-4 sm:p-5 rounded-2xl flex items-center justify-between group hover:border-emerald-300 transition-all duration-300">
            <div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Collected Revenue</p>
              <h3 className="text-xl sm:text-3xl font-extrabold mt-1 text-emerald-600">₹{stats.collected_revenue.toLocaleString()}</h3>
              <p className="text-[10px] sm:text-xs text-emerald-600/80 mt-1 font-semibold">Fully Cleared</p>
            </div>
            <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </div>

          <div className="glass-card p-4 sm:p-5 rounded-2xl flex items-center justify-between group hover:border-rose-300 transition-all duration-300">
            <div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Outstanding Dues</p>
              <h3 className="text-xl sm:text-3xl font-extrabold mt-1 text-rose-600">₹{stats.uncollected_revenue.toLocaleString()}</h3>
              <p className="text-[10px] sm:text-xs text-rose-500/80 mt-1 font-semibold">Pending Dues</p>
            </div>
            <div className="p-2.5 sm:p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </div>

          <div className="glass-card p-4 sm:p-5 rounded-2xl flex items-center justify-between group hover:border-amber-300 transition-all duration-300 col-span-2 sm:col-span-1">
            <div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Expiring / Expired</p>
              <h3 className="text-xl sm:text-3xl font-extrabold mt-1 text-amber-600">
                {stats.expiring_soon_count + stats.expired_count}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1 font-semibold">
                {stats.expired_count} Expired &bull; {stats.expiring_soon_count} Soon
              </p>
            </div>
            <div className="p-2.5 sm:p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" />
            </div>
          </div>
        </section>

        {/* Dynamic Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-1 overflow-x-auto select-none no-scrollbar">
          {[
            { id: 'dashboard', label: 'Customers', icon: Users },
            { id: 'plans', label: 'Billing Plans', icon: CreditCard },
            { id: 'villages', label: 'Villages', icon: Building2 },
            { id: 'logs', label: 'WhatsApp Logs', icon: History },
            { id: 'settings', label: 'System Settings', icon: Settings },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`px-4 sm:px-5 py-3 border-b-2 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  selectedTab === tab.id 
                    ? 'border-blue-600 text-blue-600 bg-blue-50/40' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
                }`}
              >
                <Icon className="h-4 sm:h-4.5 sm:w-4.5 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content 1: Customer Directory */}
        {selectedTab === 'dashboard' && (
          <section className="flex flex-col gap-4 animate-fadeIn">
            {/* Filter and Action Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search customer name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="glass-input pl-10 pr-4 py-2.5 text-sm rounded-xl w-full border-slate-200"
                  />
                </div>

                {/* Paid/Unpaid Filter */}
                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 w-full sm:w-auto">
                  {[
                    { id: 'all', label: 'All Status' },
                    { id: 'paid', label: 'Paid Only' },
                    { id: 'unpaid', label: 'Unpaid Dues' },
                  ].map(btn => (
                    <button
                      key={btn.id}
                      onClick={() => setFilterPaid(btn.id)}
                      className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        filterPaid === btn.id 
                          ? 'bg-white text-blue-600 shadow-sm border border-slate-200' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setIsAddCustomerOpen(true)}
                className="w-full md:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
              >
                <UserPlus className="h-4.5 w-4.5" />
                Add Customer
              </button>
            </div>

            {/* RESPONSIVE SWITCHER: TABLE FOR DESKTOP, CARDS FOR MOBILE */}
            
            {/* Desktop Table Layout (md breakpoint and up) */}
            <div className="hidden md:block glass-card rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-4">Customer Details</th>
                      <th className="px-6 py-4">Equipment</th>
                      <th className="px-6 py-4">Plan & Channels</th>
                      <th className="px-6 py-4">Status & Billing</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-semibold bg-white">
                          No customer records found matching filter constraints.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map(customer => {
                        const price = customer.price_override 
                          ? parseFloat(customer.price_override) 
                          : (customer.plan_details ? parseFloat(customer.plan_details.price) : 0);
                        
                        const isExpired = customer.days_left < 0;
                        const isExpiringSoon = customer.days_left >= 0 && customer.days_left <= 3;

                        return (
                          <tr key={customer.id} className="hover:bg-slate-50/50 bg-white transition-colors">
                            <td className="px-6 py-4.5">
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                {customer.name}
                                {customer.language_preference === 'OD' && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-500 font-bold border border-slate-200">ODIA</span>}
                              </div>
                              <div className="text-xs text-slate-500 font-semibold mt-0.5">{displayPhone(customer.phone_number)}</div>
                              {customer.village_details && (
                                <div className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 mt-1.5 bg-indigo-50 px-2 py-0.5 rounded-full w-max border border-indigo-100">
                                  <Building2 className="h-3 w-3" /> {customer.village_details.name}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4.5">
                              {customer.setup_box_number || customer.setup_box_brand ? (
                                <div className="flex flex-col gap-0.5">
                                  {customer.setup_box_brand && <div className="text-xs font-bold text-slate-800">{customer.setup_box_brand}</div>}
                                  {customer.setup_box_number && <div className="text-[10px] text-slate-500 font-mono bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded w-max">{customer.setup_box_number}</div>}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">No equipment</span>
                              )}
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="font-semibold text-slate-800">
                                {customer.plan_details ? customer.plan_details.name : 'No Active Plan'}
                              </div>
                              <div className="text-xs text-blue-600 font-bold mt-0.5">
                                ₹{price} {customer.price_override && '(Override)'}
                              </div>
                              {customer.plan_details?.channels && (
                                <div className="flex flex-wrap gap-1 mt-2 max-w-[200px]">
                                  {customer.plan_details.channels.split(',').slice(0, 3).map((ch, i) => ch.trim() && (
                                    <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold border border-blue-100 rounded">
                                      {ch.trim()}
                                    </span>
                                  ))}
                                  {customer.plan_details.channels.split(',').length > 3 && (
                                    <span className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 text-[9px] font-bold rounded">
                                      +{customer.plan_details.channels.split(',').length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleTogglePayment(customer)}
                                  className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all border flex items-center gap-1.5 cursor-pointer select-none ${
                                    customer.is_paid
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                      : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                                  }`}
                                  title="Click to toggle payment state"
                                >
                                  {customer.is_paid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                  {customer.is_paid ? 'Paid' : 'Unpaid'}
                                </button>

                                {customer.is_paid && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                    isExpired 
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : isExpiringSoon
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}>
                                    {isExpired ? 'Expired' : `${customer.days_left}d left`}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 mt-1.5 font-semibold">
                                Expiry: {customer.expiry_date || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setMessageDrawerCustomer(customer);
                                  }}
                                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 hover:scale-[1.02] cursor-pointer"
                                  title="Send due reminder / custom WhatsApp notification"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  Send WhatsApp
                                </button>
                                <button
                                  onClick={() => handleOpenHistory(customer)}
                                  className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center"
                                  title="View payment & statement ledger history"
                                >
                                  <History className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCustomer({ ...customer });
                                    setIsEditCustomerOpen(true);
                                  }}
                                  className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer"
                                  title="Edit customer details"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCustomer(customer)}
                                  className="p-2 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 rounded-xl transition-all cursor-pointer"
                                  title="Delete customer record"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Touch-Friendly Card Layout (hidden on md and larger) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredCustomers.length === 0 ? (
                <div className="glass-card p-12 text-center text-slate-400 font-semibold bg-white rounded-2xl border border-slate-200">
                  No customer records found matching filter constraints.
                </div>
              ) : (
                filteredCustomers.map(customer => {
                  const price = customer.price_override 
                    ? parseFloat(customer.price_override) 
                    : (customer.plan_details ? parseFloat(customer.plan_details.price) : 0);
                  
                  const isExpired = customer.days_left < 0;
                  const isExpiringSoon = customer.days_left >= 0 && customer.days_left <= 3;

                  return (
                    <div key={customer.id} className="glass-card p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3.5">
                      {/* Customer Header Info */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-base text-slate-900">{customer.name}</h4>
                            {customer.language_preference === 'OD' && <span className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] text-slate-500 font-bold">ODIA</span>}
                          </div>
                          <p className="text-xs text-slate-500 font-bold mt-0.5">{displayPhone(customer.phone_number)}</p>
                          {customer.village_details && (
                            <div className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 mt-1.5 bg-indigo-50 px-2 py-0.5 rounded-full w-max border border-indigo-100">
                              <Building2 className="h-3 w-3" /> {customer.village_details.name}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Equipment Info */}
                      {(customer.setup_box_number || customer.setup_box_brand) && (
                        <div className="flex flex-col gap-0.5 bg-slate-50 border border-slate-100 p-2 rounded-xl mt-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Equipment</p>
                          <div className="flex items-center gap-2">
                            {customer.setup_box_brand && <span className="text-xs font-bold text-slate-700">{customer.setup_box_brand}</span>}
                            {customer.setup_box_number && <span className="text-[10px] font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">{customer.setup_box_number}</span>}
                          </div>
                        </div>
                      )}

                      {/* Subscription Details */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-100 mt-1">
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Plan Package</p>
                          <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                            {customer.plan_details ? customer.plan_details.name : 'No Active Plan'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Total Cost</p>
                          <p className="text-xs font-extrabold text-blue-600 mt-0.5">
                            ₹{price} {customer.price_override && '(Override)'}
                          </p>
                        </div>
                        {customer.plan_details?.channels && (
                          <div className="col-span-2 pt-1 border-t border-slate-200/50 mt-1">
                            <div className="flex flex-wrap gap-1">
                              {customer.plan_details.channels.split(',').slice(0, 4).map((ch, i) => ch.trim() && (
                                <span key={i} className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-600 text-[9px] font-bold rounded">
                                  {ch.trim()}
                                </span>
                              ))}
                              {customer.plan_details.channels.split(',').length > 4 && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded">
                                  +{customer.plan_details.channels.split(',').length - 4}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Status & Due Dates */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTogglePayment(customer)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm ${
                              customer.is_paid
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 active:bg-emerald-100'
                                : 'bg-rose-50 border-rose-200 text-rose-700 active:bg-rose-100'
                            }`}
                          >
                            {customer.is_paid ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                            {customer.is_paid ? 'Paid Status' : 'Unpaid Dues'}
                          </button>

                          {customer.is_paid && (
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border ${
                              isExpired 
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isExpiringSoon
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {isExpired ? 'Expired' : `${customer.days_left}d Left`}
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Due Date</p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">{customer.expiry_date || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Unified Touch Actions */}
                      <div className="grid grid-cols-4 gap-1 mt-1.5 border-t border-slate-100 pt-3">
                        <button
                          onClick={() => {
                            setMessageDrawerCustomer(customer);
                          }}
                          className="py-3 px-1 bg-indigo-50 active:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-[10px] font-extrabold transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                          title="Send WhatsApp"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          WP
                        </button>
                        <button
                          onClick={() => handleOpenHistory(customer)}
                          className="py-3 px-1 bg-blue-50 active:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-[10px] font-extrabold transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                          title="Billing History"
                        >
                          <History className="h-3.5 w-3.5" />
                          History
                        </button>
                        <button
                          onClick={() => {
                            setEditingCustomer({ ...customer });
                            setIsEditCustomerOpen(true);
                          }}
                          className="py-3 px-1 bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer)}
                          className="py-3 px-1 bg-red-50 active:bg-red-100 border border-red-100 text-red-600 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                          title="Delete Customer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* Tab Content 2: Dynamic Plans */}
        {selectedTab === 'plans' && (
          <section className="flex flex-col gap-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Dynamic Packages</h2>
                <p className="text-xs text-slate-500 font-semibold">Billing packages configured for your operator portal</p>
              </div>
              <button
                onClick={() => setIsAddPlanOpen(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <Plus className="h-4.5 w-4.5" />
                Add Package
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.length === 0 ? (
                <div className="col-span-3 glass-card p-12 text-center text-slate-400 font-semibold rounded-2xl bg-white border border-slate-200">
                  No plans configured yet.
                </div>
              ) : (
                plans.map(plan => (
                  <div key={plan.id} className="glass-card p-6 rounded-2xl bg-white flex flex-col justify-between border border-slate-200 relative group hover:border-blue-400 transition-all duration-300">
                    <div className="absolute top-4 right-4 text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                      {plan.duration_days} Days Validity
                    </div>
                    
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg mt-2">{plan.name}</h3>
                      <div className="text-3xl font-black text-slate-900 mt-4">
                        ₹{plan.price}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-1">
                        {customers.filter(c => c.plan === plan.id || c.plan_details?.id === plan.id).length} active subscribers
                      </div>

                      {plan.channels && plan.channels.trim() && (
                        <div className="mt-4">
                          <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Star className="h-3 w-3 text-blue-500" /> Included Channels
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {plan.channels.split(',').slice(0, 6).map((ch, i) => ch.trim() && (
                              <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100 rounded-full">
                                {ch.trim()}
                              </span>
                            ))}
                            {plan.channels.split(',').length > 6 && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">
                                +{plan.channels.split(',').length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-100 mt-6 pt-4 flex items-center justify-between text-xs text-slate-500 font-bold">
                      <span>Standard Billing Rate</span>
                      <button
                        onClick={() => handleDeletePlan(plan)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                        title="Delete Plan Package"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Tab Content 3: Villages */}
        {selectedTab === 'villages' && (
          <section className="flex flex-col gap-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Village / Area Management</h2>
                <p className="text-xs text-slate-500 font-semibold">Create and manage the service area villages for customer assignment</p>
              </div>
              <button
                onClick={() => setIsAddVillageOpen(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <Plus className="h-4.5 w-4.5" />
                Add Village
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {villages.length === 0 ? (
                <div className="col-span-3 glass-card p-12 text-center text-slate-400 font-semibold rounded-2xl bg-white border border-slate-200">
                  <Building2 className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  No villages configured yet. Add your first service area village.
                </div>
              ) : (
                villages.map(village => (
                  <div key={village.id} className="glass-card p-5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between group hover:border-blue-300 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{village.name}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {customers.filter(c => c.village === village.id).length} customers
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteVillage(village)}
                      className="p-2 bg-red-50 hover:bg-red-100 border border-red-100 text-red-500 rounded-xl transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Delete Village"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Village Modal */}
            {isAddVillageOpen && (
              <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="glass-card rounded-2xl w-full max-w-sm overflow-hidden border border-slate-200 bg-white animate-scaleUp shadow-xl">
                  <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      Add New Village
                    </h3>
                    <button onClick={() => setIsAddVillageOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateVillage} className="p-6 flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Village / Area Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g. Siaria, Marsaghai, Kendrapara"
                        value={newVillageName}
                        onChange={(e) => setNewVillageName(e.target.value)}
                        className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button type="button" onClick={() => setIsAddVillageOpen(false)} className="px-4 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
                      <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl cursor-pointer shadow-sm">Save Village</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Tab Content 4: WhatsApp Logs */}
        {selectedTab === 'logs' && (
          <section className="flex flex-col gap-4 animate-fadeIn">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">WhatsApp Assistant Delivery Log</h2>
              <p className="text-xs text-slate-500 font-semibold">Real-time validation tracking of all reminders, receipts, and custom texts sent. Automatically pruned after 3 days.</p>
            </div>

            <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Message Log Content</th>
                      <th className="px-6 py-4">Sent Time (IST)</th>
                      <th className="px-6 py-4 text-right">Delivery Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs font-bold">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-semibold bg-white">
                          No messages logged in this session.
                        </td>
                      </tr>
                    ) : (
                      logs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50 bg-white transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">{log.customer_name}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                              log.message_type === 'RECEIPT'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : log.message_type === 'REMINDER'
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'bg-blue-50 border-blue-200 text-blue-700'
                            }`}>
                              {log.message_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 max-w-sm truncate" title={log.message_content}>
                            {log.message_content}
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-medium">
                            {new Date(log.sent_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center gap-1 font-extrabold px-2.5 py-1 rounded-full border text-[10px] ${
                              log.status === 'SENT' 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                : log.status === 'SENDING'
                                ? 'bg-blue-50 border-blue-200 text-blue-700 animate-pulse'
                                : log.status === 'PENDING'
                                ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse'
                                : 'bg-rose-50 border-rose-200 text-rose-700'
                            }`}>
                              {log.status === 'SENT' ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  Delivered
                                </>
                              ) : log.status === 'SENDING' ? (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                  Sending
                                </>
                              ) : log.status === 'PENDING' ? (
                                <>
                                  <RefreshCw className="h-3 w-3" />
                                  Queued
                                </>
                              ) : (
                                <>
                                  <X className="h-3 w-3" />
                                  Failed
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteLog(log)}
                              className="p-2 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                              title="Delete log entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Tab Content 4: Settings */}
        {selectedTab === 'settings' && (
          <section className="flex flex-col gap-6 animate-fadeIn max-w-3xl">
            {/* Custom Admin Password Settings Changer */}
            <div className="glass-card p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Console Security Settings</h2>
                <p className="text-xs text-slate-500 font-semibold font-sans">Change the customizable operator panel password.</p>
              </div>

              {changePasswordMsg && (
                <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  changePasswordMsg.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>{changePasswordMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="flex flex-col gap-4 max-w-md mt-2.5">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Old password (default: admin)"
                    value={changeOldPassword}
                    onChange={(e) => setChangeOldPassword(e.target.value)}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    New Security Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Type new secure password"
                    value={changeNewPassword}
                    onChange={(e) => setChangeNewPassword(e.target.value)}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-type new password"
                    value={changeConfirmPassword}
                    onChange={(e) => setChangeConfirmPassword(e.target.value)}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-sm w-fit mt-1.5"
                >
                  Update Admin Password
                </button>
              </form>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">System Settings & Gateway Connection</h2>
                <p className="text-xs text-slate-500 font-semibold">Verify database statuses and direct portal linkage</p>
              </div>

              <div className="flex flex-col gap-5 border-t border-slate-100 pt-6">
                {/* Dynamic Reminder Rule */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    Global Automated Reminder Window
                  </label>
                  <div className="flex items-center gap-2 max-w-xs">
                    <input
                      type="number"
                      defaultValue="2"
                      className="glass-input px-3.5 py-2 text-sm rounded-xl w-24 text-center font-extrabold border-slate-300"
                    />
                    <span className="text-sm font-bold text-slate-500">Days Before Due Date</span>
                  </div>
                </div>

                {/* Neon Cloud DB Status */}
                <div className="mt-1">
                  <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    Active Database Connection URL
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="glass-input px-4 py-3 text-xs rounded-xl w-full font-mono text-slate-500 bg-slate-50 border-slate-200 pr-10"
                      disabled
                      value="postgresql://neondb_owner:***@ep-young-grass-aol4l7y5-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
                    />
                    <div className="absolute right-3.5 top-3.5 h-2 w-2 rounded-full bg-emerald-500" title="Active"></div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                    Successfully utilizing production-ready cloud Neon PostgreSQL. Complete data durability enabled.
                  </p>
                </div>

                {/* Remotion Render Config */}
                <div className="mt-2">
                  <h3 className="text-sm font-bold text-slate-800 mb-2.5">Remotion Video Render Engine</h3>
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <PlayCircle className="h-8 w-8 text-blue-600 shrink-0" />
                      <div>
                        <div className="text-xs font-extrabold text-slate-800">CLI Background Video Compiler</div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Generates premium receipts automatically</div>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-extrabold rounded-xl cursor-pointer">
                      Test Render CLI
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* EMBEDDED NATIVE WHATSAPP GATEWAY SETUP PANEL */}
            <div className="glass-card p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    gatewayStatus === 'CONNECTED' ? 'bg-emerald-50 text-emerald-600' :
                    gatewayStatus === 'QR_READY' ? 'bg-blue-50 text-blue-600' :
                    gatewayStatus === 'INITIALIZING' || gatewayStatus === 'AUTHENTICATING' ? 'bg-amber-50 text-amber-600' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      WhatsApp Gateway Control Panel
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      {gatewayStatus === 'CONNECTED' ? 'Your phone is successfully linked and online.' :
                       gatewayStatus === 'QR_READY' ? 'Scan the QR code to connect your operator account.' :
                       gatewayStatus === 'INITIALIZING' ? 'Starting up the local WhatsApp automation engine...' :
                       gatewayStatus === 'AUTHENTICATING' ? 'Logging in, finalizing connection...' :
                       gatewayStatus === 'DISCONNECTED' ? 'Engine is ready. Scanner is loading...' :
                       'Gateway server offline. Make sure the start script is running.'}
                    </p>
                  </div>
                </div>

                {/* STATUS BADGE */}
                <div className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  gatewayStatus === 'CONNECTED' ? 'bg-emerald-100 text-emerald-800' :
                  gatewayStatus === 'QR_READY' ? 'bg-blue-100 text-blue-800' :
                  gatewayStatus === 'INITIALIZING' || gatewayStatus === 'AUTHENTICATING' ? 'bg-amber-100 text-amber-800' :
                  gatewayStatus === 'DISCONNECTED' ? 'bg-slate-100 text-slate-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {gatewayStatus === 'CONNECTED' ? '● Connected' :
                   gatewayStatus === 'QR_READY' ? '● Needs Scan' :
                   gatewayStatus === 'INITIALIZING' ? '● Starting' :
                   gatewayStatus === 'AUTHENTICATING' ? '● Connecting' :
                   gatewayStatus === 'DISCONNECTED' ? '● Standby' :
                   '● Offline'}
                </div>
              </div>
              
              <div className="mt-4 p-6 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center min-h-[350px]">
                {gatewayStatus === 'OFFLINE' && (
                  <div className="text-center max-w-sm">
                    <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-slate-800 mb-1">Gateway Offline</h4>
                    <p className="text-xs text-slate-500 font-semibold mb-4">
                      The embedded WhatsApp engine is currently offline. Please run the start script in your terminal to boot it up.
                    </p>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="px-4 py-2 bg-slate-200 text-slate-800 hover:bg-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 mx-auto shadow-sm"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry Connection
                    </button>
                  </div>
                )}

                {gatewayStatus === 'INITIALIZING' && (
                  <div className="text-center">
                    <div className="h-8 w-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <h4 className="text-sm font-bold text-slate-800 mb-1">Starting Engine</h4>
                    <p className="text-xs text-slate-500 font-semibold">
                      Spawning local WhatsApp driver... This may take up to 15 seconds.
                    </p>
                  </div>
                )}

                {gatewayStatus === 'AUTHENTICATING' && (
                  <div className="text-center">
                    <div className="h-8 w-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <h4 className="text-sm font-bold text-slate-800 mb-1">Authenticating</h4>
                    <p className="text-xs text-slate-500 font-semibold">
                      Exchanging keys and syncing messages...
                    </p>
                  </div>
                )}

                {gatewayStatus === 'DISCONNECTED' && (
                  <div className="text-center">
                    <div className="h-8 w-8 border-3 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <h4 className="text-sm font-bold text-slate-800 mb-1">Scanner Standby</h4>
                    <p className="text-xs text-slate-500 font-semibold">
                      Waiting for the QR code stream to initialize...
                    </p>
                  </div>
                )}

                {gatewayStatus === 'QR_READY' && qrCode && (
                  <div className="text-center max-w-md">
                    <h4 className="text-sm font-bold text-slate-800 mb-3">Link Operator WhatsApp Account</h4>
                    
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm inline-block mb-4">
                      <img 
                        src={qrCode} 
                        alt="WhatsApp QR Code" 
                        className="w-[220px] h-[220px] mx-auto select-none" 
                      />
                    </div>
                    
                    <div className="text-left bg-blue-50/50 border border-blue-100 rounded-xl p-4.5 max-w-sm mx-auto">
                      <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-blue-800 mb-2 flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        Scan Instructions
                      </h5>
                      <ol className="list-decimal list-inside text-[11px] font-semibold text-slate-600 space-y-1">
                        <li>Open WhatsApp on your phone.</li>
                        <li>Tap <strong className="text-slate-800">Menu / Settings</strong> &rarr; <strong className="text-slate-800">Linked Devices</strong>.</li>
                        <li>Tap <strong className="text-slate-800">Link a Device</strong> and point your camera here.</li>
                      </ol>
                    </div>
                  </div>
                )}

                {gatewayStatus === 'CONNECTED' && (
                  <div className="text-center max-w-sm bg-emerald-50/20 border border-emerald-100/50 p-6 rounded-2xl">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full w-fit mx-auto mb-3.5 shadow-sm">
                      <Check className="h-6 w-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mb-1">WhatsApp Live & Online</h4>
                    <p className="text-xs text-slate-500 font-semibold mb-6">
                      Notifications, due warning videos, and custom Odia receipts will be sent automatically.
                    </p>
                    
                    <button
                      onClick={handleDisconnectGateway}
                      disabled={isDisconnecting}
                      className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 mx-auto disabled:opacity-50 shadow-sm border border-red-100"
                    >
                      {isDisconnecting ? (
                        <>
                          <div className="h-3.5 w-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                          Disconnecting...
                        </>
                      ) : (
                        <>
                          <X className="h-3.5 w-3.5" />
                          Disconnect Device
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-[10px] font-bold tracking-wider text-slate-500">
        © 2026 Mahalaxmi Network. All Rights Reserved.
      </footer>

      {/* QUICK PAYMENT ACTION SELECTOR POPUP */}
      {quickPayCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl w-full max-w-md overflow-hidden border border-slate-200 bg-white animate-scaleUp shadow-xl">
            <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-600" />
                Confirm Payment Receipt
              </h3>
              <button 
                onClick={() => setQuickPayCustomer(null)} 
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="text-sm font-semibold text-slate-600">
                You are marking <strong className="text-slate-900">{quickPayCustomer.name}</strong> as <span className="text-emerald-600">PAID</span>. Choose the WhatsApp confirmation message style:
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => performMarkPaid(quickPayCustomer, 'text_receipt')}
                  className="w-full p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl font-bold text-sm text-left flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <div>
                    <div>Send Instant Text Receipt (Recommended)</div>
                    <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Immediate delivery, skips slow video compile.</div>
                  </div>
                  <Send className="h-4.5 w-4.5 shrink-0 text-emerald-600" />
                </button>

                <button
                  onClick={() => performMarkPaid(quickPayCustomer, 'video_receipt')}
                  className="w-full p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-xl font-bold text-sm text-left flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <div>
                    <div>Compile & Send Animated Video Receipt</div>
                    <div className="text-[10px] text-blue-600 font-semibold mt-0.5">Renders premium customized MP4 before delivery.</div>
                  </div>
                  <PlayCircle className="h-4.5 w-4.5 shrink-0 text-blue-600" />
                </button>

                <button
                  onClick={() => performMarkPaid(quickPayCustomer, 'none')}
                  className="w-full p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl font-bold text-sm text-left flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <div>
                    <div>Mark Paid ONLY (Skip Notification)</div>
                    <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Updates record directly. No message will be sent.</div>
                  </div>
                  <X className="h-4.5 w-4.5 shrink-0 text-slate-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: SEND WHATSAPP ASSISTANT NOTIFICATIONS */}
      {messageDrawerCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-slideLeft">
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-extrabold text-slate-950 flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-indigo-600" />
                    WhatsApp Delivery Control
                  </h3>
                  <p className="text-slate-500 text-xs font-semibold mt-0.5">
                    Target: {messageDrawerCustomer.name} ({displayPhone(messageDrawerCustomer.phone_number)})
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setMessageDrawerCustomer(null);
                    setCustomMsg('');
                  }} 
                  className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer rounded-xl hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-6 text-left">
                {/* Block 1: Structured Templates */}
                {!messageDrawerCustomer.is_paid ? (
                  <div className="flex flex-col gap-3">
                    <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Standard Due Reminders (Background Queued)
                    </span>
                    
                    <div className="flex flex-col gap-2.5">
                      <button
                        onClick={() => handleSendReminder(messageDrawerCustomer, 'upi_qr_reminder')}
                        disabled={isSending}
                        className="p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-between text-left cursor-pointer transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <div>Send UPI QR Code Payment Reminder</div>
                          </div>
                          <div className="text-[9px] text-emerald-600 font-semibold mt-0.5">Generates dynamic UPI QR for Rs. {messageDrawerCustomer.price_override || messageDrawerCustomer.plan_details?.price || 0} to UPI ID 9777547420@ybl.</div>
                        </div>
                        <Smartphone className="h-4 w-4 text-emerald-600 shrink-0" />
                      </button>

                      <button
                        onClick={() => handleSendReminder(messageDrawerCustomer, 'text_reminder')}
                        disabled={isSending}
                        className="p-3.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl flex items-center justify-between text-left cursor-pointer transition-all"
                      >
                        <div>
                          <div>Send Standard Text Reminder</div>
                          <div className="text-[9px] text-amber-600 font-semibold mt-0.5">Instant message containing cost and due dates.</div>
                        </div>
                        <Send className="h-4 w-4 text-amber-600 shrink-0" />
                      </button>

                      <button
                        onClick={() => handleSendReminder(messageDrawerCustomer, 'deactivation_warning')}
                        disabled={isSending}
                        className="p-3.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 text-xs font-bold rounded-xl flex items-center justify-between text-left cursor-pointer transition-all"
                      >
                        <div>
                          <div>Send Critical Deactivation Alert</div>
                          <div className="text-[9px] text-red-600 font-semibold mt-0.5">Urgent template stating instant network cut-off.</div>
                        </div>
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                      </button>

                      <button
                        onClick={() => handleSendReminder(messageDrawerCustomer, 'video_reminder')}
                        disabled={isSending}
                        className="p-3.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-bold rounded-xl flex items-center justify-between text-left cursor-pointer transition-all"
                      >
                        <div>
                          <div>Render & Send Remotion Video Reminder</div>
                          <div className="text-[9px] text-indigo-600 font-semibold mt-0.5">Compiles beautiful personalized MP4 video first.</div>
                        </div>
                        <PlayCircle className="h-4 w-4 text-indigo-600 shrink-0" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Receipt Notifications (Background Queued)
                    </span>
                    
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleSendReminder(messageDrawerCustomer, 'text_receipt')}
                        disabled={isSending}
                        className="p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-between text-left cursor-pointer transition-all"
                      >
                        <div>
                          <div>Send Standard Text Receipt</div>
                          <div className="text-[9px] text-emerald-600 font-semibold mt-0.5">Instant notification of renewal success.</div>
                        </div>
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      </button>

                      <button
                        onClick={() => handleSendReminder(messageDrawerCustomer, 'video_receipt')}
                        disabled={isSending}
                        className="p-3.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-bold rounded-xl flex items-center justify-between text-left cursor-pointer transition-all"
                      >
                        <div>
                          <div>Render & Send Remotion Video Receipt</div>
                          <div className="text-[9px] text-indigo-600 font-semibold mt-0.5">Compiles customized receipt video file.</div>
                        </div>
                        <PlayCircle className="h-4 w-4 text-indigo-600 shrink-0" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-100 my-2"></div>

                {/* Block 2: Custom Text Fields */}
                <form onSubmit={handleSendCustomMessage} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                      Write Custom WhatsApp Message
                    </label>
                    
                    {/* Quick Template Picker */}
                    <div className="flex gap-2 flex-wrap mb-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          const template = messageDrawerCustomer.language_preference === 'OD'
                            ? `ପ୍ରିୟ ${messageDrawerCustomer.name}, ମହାଲକ୍ଷ୍ମୀ ନେଟୱର୍କ ତରଫରୁ ଆପଣଙ୍କୁ ନମସ୍କାର।`
                            : `Hello ${messageDrawerCustomer.name}, greetings from Mahalaxmi Network.`;
                          setCustomMsg(template);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer"
                      >
                        Greeting
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const price = messageDrawerCustomer.price_override || messageDrawerCustomer.plan_details?.price || 0;
                          const template = messageDrawerCustomer.language_preference === 'OD'
                            ? `ପ୍ରିୟ ${messageDrawerCustomer.name}, ଆପଣଙ୍କର କେବୁଲ୍ ଟିଭି ସବସ୍କ୍ରିପସନ୍ ₹${price} ପେମେଣ୍ଟ ବାକି ଅଛି। ଦୟାକରି ଯଥାଶୀଘ୍ର ପୈଠ କରନ୍ତୁ।`
                            : `Dear ${messageDrawerCustomer.name}, payment reminder for your cable TV subscription of ₹${price} is pending. Please clear it soon.`;
                          setCustomMsg(template);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer"
                      >
                        Pending Dues
                      </button>
                    </div>

                    <textarea
                      rows="5"
                      required
                      placeholder="Type in Odia (ଓଡ଼ିଆ) or English..."
                      value={customMsg}
                      onChange={(e) => setCustomMsg(e.target.value)}
                      className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-200 font-medium"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-4.5 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 active:scale-95 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    {isSending ? (
                      <>
                        <div className="h-4.5 w-4.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                        Enqueuing Message...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Queue Custom Text via OpenClaw
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 text-[10px] text-slate-500 font-bold bg-slate-50">
              Note: Messages are processed one-by-one sequentially in the background queue for smooth delivery.
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOMER */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl w-full max-w-lg overflow-hidden border border-slate-200 bg-white animate-scaleUp shadow-xl">
            <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-955 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                Add New Customer
              </h3>
              <button 
                onClick={() => setIsAddCustomerOpen(false)} 
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 flex flex-col gap-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Manoj Sahoo"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. 7894376226 (Optional)"
                    value={newCustomer.phone_number}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone_number: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                  />
                  <span className="text-[10px] text-slate-400 font-bold mt-1 block">Indian country code +91 will be added automatically. Leave blank if none.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Billing Package *
                  </label>
                  <select
                    required
                    value={newCustomer.plan}
                    onChange={(e) => setNewCustomer({ ...newCustomer, plan: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300 font-bold bg-white"
                  >
                    <option value="" disabled>Select package</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Price Override (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="E.g. 240.00"
                    value={newCustomer.price_override}
                    onChange={(e) => setNewCustomer({ ...newCustomer, price_override: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Portal Password (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="Custom password (Default: last 4 digits of phone)"
                    value={newCustomer.password || ''}
                    onChange={(e) => setNewCustomer({ ...newCustomer, password: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Village / Area (Optional)
                  </label>
                  <select
                    value={newCustomer.village || ''}
                    onChange={(e) => setNewCustomer({ ...newCustomer, village: e.target.value || null })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300 font-bold bg-white"
                  >
                    <option value="">Select village (optional)</option>
                    {villages.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Setup Box Serial / Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. SB-2024-001234"
                    value={newCustomer.setup_box_number || ''}
                    onChange={(e) => setNewCustomer({ ...newCustomer, setup_box_number: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Setup Box Brand / Model (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. Airtel Xstream, Tata Play"
                    value={newCustomer.setup_box_brand || ''}
                    onChange={(e) => setNewCustomer({ ...newCustomer, setup_box_brand: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Activation Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newCustomer.activation_date}
                    onChange={(e) => setNewCustomer({ ...newCustomer, activation_date: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-xs rounded-xl w-full border-slate-300 font-bold"
                  />
                </div>

                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Language
                  </label>
                  <select
                    value={newCustomer.language_preference}
                    onChange={(e) => setNewCustomer({ ...newCustomer, language_preference: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300 font-bold bg-white"
                  >
                    <option value="OD">Odia (ଓଡ଼ିଆ)</option>
                    <option value="EN">English</option>
                  </select>
                </div>

                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Reminder (Days before)
                  </label>
                  <input
                    type="number"
                    value={newCustomer.reminder_days_before}
                    onChange={(e) => setNewCustomer({ ...newCustomer, reminder_days_before: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300 font-extrabold text-center"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 mt-4 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMER BILLING & PAYMENT HISTORY STATEMENT */}
      {isHistoryOpen && historyCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl w-full max-w-2xl overflow-hidden border border-slate-200 bg-white animate-scaleUp shadow-xl">
            <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-950 flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                Customer Billing Statement
              </h3>
              <button 
                onClick={() => {
                  setIsHistoryOpen(false);
                  setHistoryCustomer(null);
                  setHistoryTransactions([]);
                }} 
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 text-left">
              {/* Customer summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">{historyCustomer.name}</h4>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">{displayPhone(historyCustomer.phone_number)}</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Package</span>
                  <p className="font-extrabold text-sm text-slate-800">
                    {historyCustomer.plan_details ? historyCustomer.plan_details.name : 'Custom Active Package'}
                  </p>
                </div>
              </div>

              {/* Transactions list */}
              <div>
                <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                  Transaction Ledger Statements
                </h5>
                <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-xl">
                  {loadingHistory ? (
                    <div className="py-12 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                      Fetching payment statement history...
                    </div>
                  ) : historyTransactions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-semibold">
                      No payment transactions recorded for this customer.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          <th className="px-4 py-3">Payment Date</th>
                          <th className="px-4 py-3">Billing Package</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Expiry Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {historyTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50 bg-white">
                            <td className="px-4 py-3 font-semibold text-slate-700">{tx.payment_date || tx.created_at?.split('T')[0]}</td>
                            <td className="px-4 py-3 font-medium text-slate-600">{tx.plan_name}</td>
                            <td className="px-4 py-3 font-extrabold text-emerald-600">₹{tx.amount}</td>
                            <td className="px-4 py-3 font-bold text-slate-700">{tx.expiry_date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Premium download statement card */}
              <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[10px] text-slate-400 font-bold leading-normal text-center sm:text-left max-w-sm">
                  Click the button to download a branded PIL-rendered ledger statement card for this customer's last 7 payments.
                </p>
                <a
                  href={`${API_BASE}/customers/${historyCustomer.id}/history_image/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Statement Card
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CUSTOMER (WITH MANUAL EXPIRY DATE OVERRIDE) */}
      {isEditCustomerOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl w-full max-w-lg overflow-hidden border border-slate-200 bg-white animate-scaleUp shadow-xl">
            <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-950 flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-indigo-600" />
                Edit Customer Record
              </h3>
              <button 
                onClick={() => {
                  setIsEditCustomerOpen(false);
                  setEditingCustomer(null);
                }} 
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditCustomer} className="p-6 flex flex-col gap-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. 7894376226 (Optional)"
                    value={(editingCustomer.phone_number || '').replace('+91', '')}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone_number: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                  />
                  <span className="text-[10px] text-slate-400 font-bold mt-1 block">Auto-prefixed with +91 if 10-digit number. Leave blank if none.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Billing Package *
                  </label>
                  <select
                    required
                    value={editingCustomer.plan || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, plan: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300 font-bold bg-white"
                  >
                    <option value="" disabled>Select package</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Price Override (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingCustomer.price_override || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, price_override: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Portal Password (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="Custom password (Default: last 4 digits of phone)"
                    value={editingCustomer.password || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, password: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Village / Area (Optional)
                  </label>
                  <select
                    value={editingCustomer.village || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, village: e.target.value || null })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300 font-bold bg-white"
                  >
                    <option value="">Select village (optional)</option>
                    {villages.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Setup Box Serial / Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. SB-2024-001234"
                    value={editingCustomer.setup_box_number || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, setup_box_number: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Setup Box Brand / Model (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. Airtel Xstream, Tata Play"
                    value={editingCustomer.setup_box_brand || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, setup_box_brand: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                  />
                </div>
              </div>

              {/* CRITICAL MANUALLY ADJUSTABLE DATES SECTION */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col gap-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                  Subscription Timing & Overrides
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                      Activation Date
                    </label>
                    <input
                      type="date"
                      required
                      value={editingCustomer.activation_date || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, activation_date: e.target.value })}
                      className="glass-input px-3 py-2 text-xs rounded-xl w-full border-slate-300 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1 text-blue-700">
                      Expiry Date (Manual Override)
                    </label>
                    <input
                      type="date"
                      required
                      value={editingCustomer.expiry_date || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, expiry_date: e.target.value })}
                      className="glass-input px-3 py-2 text-xs rounded-xl w-full border-blue-400 text-blue-900 font-extrabold bg-blue-50/20"
                    />
                  </div>
                </div>
                
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                  Note: Editing the Expiry Date directly allows manual adjustment or extension of the client subscription duration without resetting the billing package.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    WhatsApp Language
                  </label>
                  <select
                    value={editingCustomer.language_preference}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, language_preference: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300 font-bold bg-white"
                  >
                    <option value="OD">Odia (ଓଡ଼ିଆ)</option>
                    <option value="EN">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Reminder Days Before
                  </label>
                  <input
                    type="number"
                    value={editingCustomer.reminder_days_before}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, reminder_days_before: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300 font-extrabold text-center"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="editIsPaid"
                  checked={editingCustomer.is_paid}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, is_paid: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="editIsPaid" className="text-xs font-extrabold text-slate-700 cursor-pointer select-none">
                  Customer has fully paid current due balance
                </label>
              </div>

              <div className="border-t border-slate-100 mt-4 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditCustomerOpen(false);
                    setEditingCustomer(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD PLAN */}
      {isAddPlanOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl w-full max-w-sm overflow-hidden border border-slate-200 bg-white animate-scaleUp shadow-xl">
            <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-950 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Add Package Plan
              </h3>
              <button onClick={() => setIsAddPlanOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="p-6 flex flex-col gap-4 text-left">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                  Package Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Standard Digital SD"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="250.00"
                    value={newPlan.price}
                    onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    value={newPlan.duration_days}
                    onChange={(e) => setNewPlan({ ...newPlan, duration_days: e.target.value })}
                    className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full text-center font-extrabold border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                  Channel List (Optional — comma separated)
                </label>
                <textarea
                  rows="3"
                  placeholder="E.g. Star Plus, Zee TV, Sony, Colors, Star Sports, Discovery..."
                  value={newPlan.channels || ''}
                  onChange={(e) => setNewPlan({ ...newPlan, channels: e.target.value })}
                  className="glass-input px-3.5 py-2.5 text-sm rounded-xl w-full border-slate-300"
                />
                <span className="text-[10px] text-slate-400 font-bold mt-1 block">Channels visible to the customer in their portal.</span>
              </div>

              <div className="border-t border-slate-100 mt-4 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddPlanOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Create Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
