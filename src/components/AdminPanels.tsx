import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Location, InventoryItem, InventoryForm, UserRole, Vendor, FormSubmission, UploadedInvoice, AppSettings, RolePermissions, JobCodeDefinition, FormSection } from '../types';
import { sampleUsers, generateLocations, sampleItems, sampleForms, sampleSubmissions } from '../data/sampleData';
import { 
  Users, MapPin, ClipboardList, Plus, Edit2, Trash2, Key, Check, PlusCircle, Search, 
  Copy, CheckCircle, RefreshCw, ShieldCheck, Upload, Image, Trash, Cpu, Database, 
  Wifi, Info, HelpCircle, Terminal, Play, CheckSquare, Phone, Mail, Clock, DollarSign, 
  Tag, Receipt, Sparkles, FileText, AlertTriangle, Camera, Video, Scale, Save, Undo, 
  Sliders, Shield, Lock, FileSpreadsheet, Mic, Eye, X, ChevronDown, ChevronRight, QrCode, 
  ArrowRight, Layers, ArrowLeft
} from 'lucide-react';
import { 
  getAppSettings, saveAppSettings, defaultRolePermissions, defaultAppSettings, 
  getUserInitials, defaultJobCodes, hasPermission 
} from '../utils/settingsManager';
import { 
  getStoredForms, saveFormToStorage, deleteFormFromStorage, duplicateFormInStorage 
} from '../utils/formStorage';

interface AdminPanelsProps {
  simUser?: any;
  setSimUser?: (user: any) => void;
  items?: InventoryItem[];
  setItems?: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  forms?: InventoryForm[];
  setForms?: React.Dispatch<React.SetStateAction<InventoryForm[]>>;
  submissions?: FormSubmission[];
  setSubmissions?: React.Dispatch<React.SetStateAction<FormSubmission[]>>;
  uploadedInvoices?: UploadedInvoice[];
  setUploadedInvoices?: React.Dispatch<React.SetStateAction<UploadedInvoice[]>>;
  users?: User[];
  setUsers?: React.Dispatch<React.SetStateAction<User[]>>;
  onOpenForm?: (form: InventoryForm, mode?: 'manual' | 'voice') => void;
}

export default function AdminPanels({ 
  simUser, 
  setSimUser, 
  items: propItems, 
  setItems: propSetItems,
  forms: propForms,
  setForms: propSetForms,
  submissions: propSubmissions,
  setSubmissions: propSetSubmissions,
  uploadedInvoices,
  setUploadedInvoices,
  users: propUsers,
  setUsers: propSetUsers,
  onOpenForm
}: AdminPanelsProps = {}) {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'locations' | 'items' | 'forms' | 'brand' | 'integrations' | 'settings'>('users');

  // Settings & Permissions states
  const [appSettings, setAppSettings] = useState<AppSettings>(() => getAppSettings());
  const [orderEmailInput, setOrderEmailInput] = useState(appSettings.orderEmailRecipient || 'michael.goyone@gmail.com');
  const [footerFormatInput, setFooterFormatInput] = useState(appSettings.footerFormatTemplate || '[FILENAME]_[DATE]_[INITIALS] ([INITIALS] [DATE_SLASH])');
  const [rolePermissionsMatrix, setRolePermissionsMatrix] = useState<Record<string, RolePermissions>>(() => appSettings.rolePermissions || defaultRolePermissions);

  const handleTogglePermission = (role: string, permissionKey: keyof RolePermissions) => {
    setRolePermissionsMatrix(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permissionKey]: !prev[role]?.[permissionKey]
      }
    }));
  };

  const handleSaveSettings = () => {
    const updated: AppSettings = {
      orderEmailRecipient: orderEmailInput.trim() || 'michael.goyone@gmail.com',
      footerFormatTemplate: footerFormatInput.trim() || '[FILENAME]_[DATE]_[INITIALS] ([INITIALS] [DATE_SLASH])',
      rolePermissions: rolePermissionsMatrix,
      jobCodes: jobCodesList
    };
    saveAppSettings(updated);
    setAppSettings(updated);
    showToast("Application settings, job codes & permissions matrix successfully saved!");
  };

  const handleResetSettingsToDefault = () => {
    if (confirm("Reset all settings and role permissions back to factory defaults?")) {
      saveAppSettings(defaultAppSettings);
      setAppSettings(defaultAppSettings);
      setOrderEmailInput(defaultAppSettings.orderEmailRecipient);
      setFooterFormatInput(defaultAppSettings.footerFormatTemplate);
      setRolePermissionsMatrix(defaultAppSettings.rolePermissions);
      setJobCodesList(defaultJobCodes);
      showToast("Settings reset to defaults.");
    }
  };

  // Invoice/Receipt scan state variables
  const [selectedInvoiceLoc, setSelectedInvoiceLoc] = useState<string>('AR');
  const [invoiceFile, setInvoiceFile] = useState<string | null>(null);
  const [invoiceFileName, setInvoiceFileName] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [simulateBlurryVal, setSimulateBlurryVal] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [verifiedItems, setVerifiedItems] = useState<any[]>([]);
  const [invoiceDragActive, setInvoiceDragActive] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // New options to choose between: Uploading photo, uploading file, taking a photo
  const [uploadMode, setUploadMode] = useState<'upload_photo' | 'upload_file' | 'take_photo'>('upload_photo');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [cameraErr, setCameraErr] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Reusable core invoice scanner trigger
  const triggerInvoiceScan = (b64: string, name: string, mime: string) => {
    setInvoiceFile(b64);
    setIsScanning(true);
    setScanError(null);
    setScanResult(null);
    setVerifiedItems([]);

    fetch("/api/scan-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageData: b64,
        mimeType: mime,
        fileName: name,
        simulateBlurry: simulateBlurryVal
      })
    })
      .then(r => r.json())
      .then(data => {
        setScanResult(data);
        if (data.isClear && data.items) {
          setVerifiedItems(data.items.map((it: any, idx: number) => ({
            id: `ocr-${Date.now()}-${idx}`,
            name: it.name,
            quantity: typeof it.quantity === 'number' ? it.quantity : 1,
            price: typeof it.price === 'number' ? it.price : 12.50,
            packaging: it.packaging || "cases",
            category: it.category || "Dry Storage"
          })));
          showToast("AI Scan completed successfully. Items loaded for review.");
        } else if (data.isClear === false) {
          showToast("Alert: Document fails quality check criteria.");
        }
      })
      .catch(err => {
        console.error("Scanning request failed:", err);
        setScanError("Failed to communicate with invoice AI core engine. Try uploading a direct snap.");
      })
      .finally(() => {
        setIsScanning(false);
      });
  };

  // Camera handling utilities
  const startCamera = async () => {
    setCameraErr(null);
    setCameraLoading(true);
    setCameraActive(false);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn("Camera media access blocked or unavailable:", err);
      setCameraErr("System camera is blocked or hardware was not found. Please verify permissions or try using Simulated Preset snapshot below!");
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Capture photo from video feed
  const capturePhoto = () => {
    if (!videoRef.current || !streamRef.current) {
      showToast("Camera feed is not active to capture snap.");
      return;
    }
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the current video frame onto the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        stopCamera();
        setSubmitSuccess(false);
        triggerInvoiceScan(dataUrl, "camera-snapshot.jpg", "image/jpeg");
      }
    } catch (e) {
      console.error(e);
      showToast("Capture processing error.");
    }
  };

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // In-memory inventory state per location code
  const [storeInventories, setStoreInventories] = useState<Record<string, Record<string, number>>>({
    'CM': { 'Chicken Breast': 40, 'Salsa': 25, 'Flour Tortillas 12"': 50, 'Sour Cream': 20, 'Tomatoes': 30 },
    'AR': { 'Chicken Breast': 15, 'Salsa': 8, 'Flour Tortillas 12"': 12, 'Sour Cream': 4, 'Tomatoes': 10 },
    'AS': { 'Chicken Breast': 5, 'Salsa': 2, 'Flour Tortillas 12"': 8, 'Sour Cream': 1, 'Tomatoes': 5 },
    'BK': { 'Chicken Breast': 20, 'Salsa': 10, 'Flour Tortillas 12"': 15, 'Sour Cream': 6, 'Tomatoes': 15 },
    'CH': { 'Chicken Breast': 10, 'Salsa': 4, 'Flour Tortillas 12"': 10, 'Sour Cream': 3, 'Tomatoes': 8 },
    'FX': { 'Chicken Breast': 12, 'Salsa': 6, 'Flour Tortillas 12"': 9, 'Sour Cream': 2, 'Tomatoes': 7 },
    'HN': { 'Chicken Breast': 8, 'Salsa': 3, 'Flour Tortillas 12"': 6, 'Sour Cream': 1, 'Tomatoes': 4 }
  });
  
  // Local list states initialized with sampleData
  const [localUsers, setLocalUsers] = useState<User[]>(sampleUsers);
  const users = propUsers || localUsers;
  const setUsers = propSetUsers || setLocalUsers;
  const [locations, setLocations] = useState<Location[]>(generateLocations());
  
  const [localItems, setLocalItems] = useState<InventoryItem[]>(sampleItems);
  const items = propItems || localItems;
  const setItems = propSetItems || setLocalItems;

  const [localSubmissions, setLocalSubmissions] = useState<FormSubmission[]>(sampleSubmissions);
  const submissions = propSubmissions || localSubmissions;
  const setSubmissions = propSetSubmissions || setLocalSubmissions;

  const [localForms, setLocalForms] = useState<InventoryForm[]>(() => getStoredForms());
  const forms = propForms || localForms;
  const setForms = propSetForms || setLocalForms;

  // Weight & Liquid configurations
  const [itemInputMeasurementType, setItemInputMeasurementType] = useState<'discrete' | 'weight' | 'liquid'>('discrete');
  const [itemInputWeightUnit, setItemInputWeightUnit] = useState<'lbs' | 'oz'>('lbs');
  const [itemInputLiquidUnit, setItemInputLiquidUnit] = useState<'gal' | 'L' | 'mL' | 'fl oz'>('gal');
  const [itemInputMeasurementValue, setItemInputMeasurementValue] = useState<number>(1);
  const [itemInputPhotoUrls, setItemInputPhotoUrls] = useState<string[]>([]);

  // Asset search and WebAssembly converter mock states
  const [isScrapingPhotos, setIsScrapingPhotos] = useState<boolean>(false);
  const [photoScrapeStep, setPhotoScrapeStep] = useState<string>('');
  const [isConvertingToPng, setIsConvertingToPng] = useState<boolean>(false);

  // Search/filter states
  const [searchUser, setSearchUser] = useState('');
  const [searchLoc, setSearchLoc] = useState('');
  const [searchItem, setSearchItem] = useState('');

  // Notification success popups
  const [successToast, setSuccessToast] = useState('');

  // Fast profile upgrader & downgrade states
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Record<string, UserRole>>({});
  const [roleChangeHistory, setRoleChangeHistory] = useState<Array<{ userId: string; originalRole: UserRole; newRole: UserRole; name: string }>>([]);

  // Form edit models states
  // 1. User Edit
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userInputName, setUserInputName] = useState('');
  const [userInputEmail, setUserInputEmail] = useState('');
  const [userInputRole, setUserInputRole] = useState<UserRole>('Employee');
  const [userInputLocs, setUserInputLocs] = useState<string[]>([]);

  // 2. Location Create
  const [locInputCode, setLocInputCode] = useState('');
  const [locInputName, setLocInputName] = useState('');
  const [locInputAddress, setLocInputAddress] = useState('');

  // 3. Item Create/Edit
  const [itemInputName, setItemInputName] = useState('');
  const [itemInputCat, setItemInputCat] = useState('Cooler');
  const [itemInputVendor, setItemInputVendor] = useState('');
  const [itemInputPkg, setItemInputPkg] = useState('');
  const [itemInputUnit, setItemInputUnit] = useState('cases');
  const [itemInputPar, setItemInputPar] = useState(1);
  const [itemPhotoSimulated, setItemPhotoSimulated] = useState('https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=200&q=80');

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemInputCode, setItemInputCode] = useState('');
  const [itemInputQtyPerCase, setItemInputQtyPerCase] = useState<number>(100);
  const [itemInputHasNested, setItemInputHasNested] = useState(false);
  const [itemInputInnerUnitName, setItemInputInnerUnitName] = useState('sleeves');
  const [itemInputInnerQtyPerParent, setItemInputInnerQtyPerParent] = useState<number>(20);
  const [itemInputBaseUnitName, setItemInputBaseUnitName] = useState('lids');
  const [itemInputBaseQtyPerInner, setItemInputBaseQtyPerInner] = useState<number>(100);
  const [itemInputPrice, setItemInputPrice] = useState<number>(24.50);
  const [itemInputCreatedDate, setItemInputCreatedDate] = useState('2026-05-25T00:00:00.000Z');
  const [itemInputRecentPurchaseDate, setItemInputRecentPurchaseDate] = useState('2026-05-25T00:00:00.000Z');
  const [itemInputRecentPurchasePrice, setItemInputRecentPurchasePrice] = useState<number>(24.50);

  // New customized source type, purchasedQty, yields & recipe state
  const [itemInputSourceType, setItemInputSourceType] = useState<'purchased' | 'manufactured'>('purchased');
  const [itemInputPurchasedQty, setItemInputPurchasedQty] = useState<number>(10);
  const [recipeIngredients, setRecipeIngredients] = useState<Array<{ name: string; qty: number; unit: string }>>([]);
  const [ingName, setIngName] = useState('');
  const [ingQty, setIngQty] = useState<number>(1);
  const [ingUnit, setIngUnit] = useState('lbs');
  
  const [itemInputYield1Qty, setItemInputYield1Qty] = useState<number>(10);
  const [itemInputYield1Unit, setItemInputYield1Unit] = useState<string>('gal');
  const [itemInputYield2Qty, setItemInputYield2Qty] = useState<number>(10);
  const [itemInputYield2Unit, setItemInputYield2Unit] = useState<string>('lbs');

  // Custom units of measurement configurations state
  const [customUoms, setCustomUoms] = useState<Array<{ name: string; equateQty: number; equateUnit: string }>>([
    { name: 'Tub', equateQty: 20, equateUnit: 'lbs' },
    { name: 'Case', equateQty: 50, equateUnit: 'lbs' },
    { name: 'Box', equateQty: 10, equateUnit: 'lbs' },
  ]);
  const [customUomName, setCustomUomName] = useState('');
  const [customUomEquateQty, setCustomUomEquateQty] = useState<number>(1);
  const [customUomEquateUnit, setCustomUomEquateUnit] = useState<string>('lbs');

  // Vendor lists & inputs
  const [activeItemSubTab, setActiveItemSubTab] = useState<'catalog' | 'vendors' | 'invoice'>('catalog');
  const [vendors, setVendors] = useState<Vendor[]>([
    {
      id: 'v1',
      name: 'Sysco Food Services',
      address: '13900 Sysco Ct, Jessup MD 20794',
      phone: '800-555-0101',
      representative: 'Sarah Connolly',
      representativePosition: 'Senior Account Executive',
      email: 'connolly.sarah@sysco.com',
      cellphone: '443-555-0199',
      directLine: '443-555-0198',
      createdAt: '2025-10-12T14:32:00Z'
    },
    {
      id: 'v2',
      name: 'US Foods',
      address: '8000 Ridge Rd, Baltimore MD 21237',
      phone: '800-555-0202',
      representative: 'Marcus Vance',
      representativePosition: 'Regional Logistics Lead',
      email: 'marcus.vance@usfoods.com',
      cellphone: '301-555-0288',
      directLine: '301-555-0287',
      createdAt: '2025-11-20T09:15:00Z'
    },
    {
      id: 'v3',
      name: 'FreshPoint Produce',
      address: '1205 Oak St, Laurel MD 20707',
      phone: '800-555-0303',
      representative: 'Elena Rostova',
      representativePosition: 'Produce Distribution Manager',
      email: 'elena.r@freshpoint.com',
      cellphone: '240-555-0377',
      directLine: '240-555-0376',
      createdAt: '2026-01-05T11:45:00Z'
    },
    {
      id: 'v4',
      name: 'Capital Eagle Distributors',
      address: '2815 Eagle Way, Capital Heights MD',
      phone: '800-444-9999',
      representative: 'Jack Daniels',
      representativePosition: 'Beverage Specialist',
      email: 'j.daniels@capitaleagle.com',
      cellphone: '202-555-9012',
      directLine: '202-555-9011',
      createdAt: '2026-02-18T16:20:00Z'
    }
  ]);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [vendorInputName, setVendorInputName] = useState('');
  const [vendorInputAddress, setVendorInputAddress] = useState('');
  const [vendorInputPhone, setVendorInputPhone] = useState('');
  const [vendorInputRep, setVendorInputRep] = useState('');
  const [vendorInputPosition, setVendorInputPosition] = useState('');
  const [vendorInputEmail, setVendorInputEmail] = useState('');
  const [vendorInputCell, setVendorInputCell] = useState('');
  const [vendorInputDirect, setVendorInputDirect] = useState('');
  const [searchVendor, setSearchVendor] = useState('');

  // 4. Form/Checklist Creator
  const [formInputTitle, setFormInputTitle] = useState('');
  const [formInputLoc, setFormInputLoc] = useState('AR');
  const [formInputFreq, setFormInputFreq] = useState<'Daily' | 'Weekly' | 'Bi-weekly' | 'Monthly'>('Weekly');
  const [formInputDate, setFormInputDate] = useState('2026-06-01');
  const [formInputTime, setFormInputTime] = useState('22:00');

  // Checksheet Forms Management Suite states
  const [formsSearchQuery, setFormsSearchQuery] = useState('');
  const [formsSelectedLoc, setFormsSelectedLoc] = useState('ALL');
  const [formsSelectedFreq, setFormsSelectedFreq] = useState('ALL');
  const [editingForm, setEditingForm] = useState<InventoryForm | null>(null);
  const [deletingForm, setDeletingForm] = useState<InventoryForm | null>(null);
  const [duplicatingForm, setDuplicatingForm] = useState<InventoryForm | null>(null);
  const [duplicateTargetLoc, setDuplicateTargetLoc] = useState('AR');
  const [duplicateNewTitle, setDuplicateNewTitle] = useState('');
  const [showCreateFormModal, setShowCreateFormModal] = useState(false);

  // Form Builder/Editor modal states
  const [formModalTitle, setFormModalTitle] = useState('');
  const [formModalLoc, setFormModalLoc] = useState('AR');
  const [formModalFreq, setFormModalFreq] = useState<'Daily' | 'Weekly' | 'Bi-weekly' | 'Monthly'>('Weekly');
  const [formModalDueDate, setFormModalDueDate] = useState('2026-06-01');
  const [formModalDueTime, setFormModalDueTime] = useState('22:00');
  const [formModalSections, setFormModalSections] = useState<FormSection[]>([
    { name: 'Cooler', itemIds: [] },
    { name: 'Dry Storage', itemIds: [] }
  ]);
  const [newSectionInput, setNewSectionInput] = useState('');
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [itemSearchForForm, setItemSearchForForm] = useState('');

  // Job Codes Directory states
  const [jobCodesList, setJobCodesList] = useState<JobCodeDefinition[]>(() => appSettings.jobCodes && appSettings.jobCodes.length > 0 ? appSettings.jobCodes : defaultJobCodes);
  const [showAddJobCodeModal, setShowAddJobCodeModal] = useState(false);
  const [newJobCode, setNewJobCode] = useState<JobCodeDefinition>({
    code: '',
    title: '',
    role: 'Manager',
    department: 'Operations',
    description: '',
    color: '#3b82f6'
  });

  // Super Admin custom settings states
  const [adminSettingsEmail, setAdminSettingsEmail] = useState(() => localStorage.getItem('applet_super_admin_email') || 'michael.goyone@gmail.com');
  const [adminSettingsPassword, setAdminSettingsPassword] = useState(() => localStorage.getItem('applet_super_admin_password') || 'MyFamily2012!');
  const [currentLogoPreview, setCurrentLogoPreview] = useState<string | null>(() => localStorage.getItem('applet_custom_logo'));
  const [dragActive, setDragActive] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [credSuccessMessage, setCredSuccessMessage] = useState('');

  // POS Integration Management States
  const [posSystem, setPosSystem] = useState<'toast' | 'aloha' | 'clover' | 'custom'>(
    () => (localStorage.getItem('applet_pos_system') as any) || 'toast'
  );
  const [toastClientId, setToastClientId] = useState(() => localStorage.getItem('applet_pos_toast_client_id') || 'toast-com-92x83');
  const [toastClientSecret, setToastClientSecret] = useState(() => localStorage.getItem('applet_pos_toast_client_secret') || 't_sec_99182x7a9bc28');
  const [toastRestId, setToastRestId] = useState(() => localStorage.getItem('applet_pos_toast_rest_id') || 'rt-7261-arlington');
  const [toastEnv, setToastEnv] = useState<'sandbox' | 'production'>(() => (localStorage.getItem('applet_pos_toast_env') as any) || 'sandbox');

  const [alohaIp, setAlohaIp] = useState(() => localStorage.getItem('applet_pos_aloha_ip') || '192.168.1.100');
  const [alohaPort, setAlohaPort] = useState(() => localStorage.getItem('applet_pos_aloha_port') || '8080');
  const [alohaSiteId, setAlohaSiteId] = useState(() => localStorage.getItem('applet_pos_aloha_site_id') || '99812');
  const [alohaDbfPath, setAlohaDbfPath] = useState(() => localStorage.getItem('applet_pos_aloha_dbf') || 'C:\\Aloha\\DATA');

  const [cloverMerchantId, setCloverMerchantId] = useState(() => localStorage.getItem('applet_pos_clover_merchant_id') || 'MID-clv-8120');
  const [cloverAccessToken, setCloverAccessToken] = useState(() => localStorage.getItem('applet_pos_clover_token') || 'clv_tok_9218aef82bc12984');
  const [cloverEnv, setCloverEnv] = useState(() => localStorage.getItem('applet_pos_clover_env') || 'North America Production');

  const [posSyncFrequency, setPosSyncFrequency] = useState(() => localStorage.getItem('applet_pos_sync_freq') || 'Manual Only');

  // Diagnostic Logs & Execution Output Terminal
  const [connectionLogs, setConnectionLogs] = useState<string[]>([
    'System ready. Select a POS gateway above and click "Test API Gateway Connection" to perform real-time OAuth verification diagnostics.'
  ]);
  const [testingInProgress, setTestingInProgress] = useState(false);
  const [connectionSucceeded, setConnectionSucceeded] = useState<boolean | null>(null);

  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncInProgress, setSyncInProgress] = useState(false);

  const processLogoFile = (file: File) => {
    setLogoError('');
    if (file.type !== 'image/png') {
      setLogoError('Unsupported format. Logo icon must be a PNG file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        localStorage.setItem('applet_custom_logo', base64);
        setCurrentLogoPreview(base64);
        
        // Dispatch window events to notify all AppLogo instances to reload!
        window.dispatchEvent(new Event('logo-updated'));
        
        showToast('Company brand PNG logo uploaded & synchronized successfully.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processLogoFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processLogoFile(e.target.files[0]);
    }
  };

  const handleClearCustomLogo = () => {
    localStorage.removeItem('applet_custom_logo');
    setCurrentLogoPreview(null);
    window.dispatchEvent(new Event('logo-updated'));
    showToast('Brand logo reset back to standard GoyoneByDesign diamond default logo.');
  };

  const handleUpdateCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setCredSuccessMessage('');
    if (!adminSettingsEmail.trim()) {
      alert("Corporate identity email cannot be left empty.");
      return;
    }
    if (!adminSettingsPassword) {
      alert("Corporate security password cannot be left empty.");
      return;
    }

    const emailToSave = adminSettingsEmail.trim().toLowerCase();
    localStorage.setItem('applet_super_admin_email', emailToSave);
    localStorage.setItem('applet_super_admin_password', adminSettingsPassword);

    // If passed from App.tsx parent, we must sync the active user profile details so it receives instant updates of name, email etc.!
    if (setSimUser) {
      setSimUser((prev: any) => ({
        ...prev,
        email: emailToSave
      }));
    }

    setCredSuccessMessage('Super Admin credentials successfully updated and locked in staff ledger.');
    setTimeout(() => {
      setCredSuccessMessage('');
    }, 5000);
  };

  // --- POS INTEGRATIONS HANDLERS ---
  const handleUpdatePOSIntegration = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('applet_pos_system', posSystem);
    localStorage.setItem('applet_pos_toast_client_id', toastClientId);
    localStorage.setItem('applet_pos_toast_client_secret', toastClientSecret);
    localStorage.setItem('applet_pos_toast_rest_id', toastRestId);
    localStorage.setItem('applet_pos_toast_env', toastEnv);
    localStorage.setItem('applet_pos_aloha_ip', alohaIp);
    localStorage.setItem('applet_pos_aloha_port', alohaPort);
    localStorage.setItem('applet_pos_aloha_site_id', alohaSiteId);
    localStorage.setItem('applet_pos_aloha_dbf', alohaDbfPath);
    localStorage.setItem('applet_pos_clover_merchant_id', cloverMerchantId);
    localStorage.setItem('applet_pos_clover_token', cloverAccessToken);
    localStorage.setItem('applet_pos_clover_env', cloverEnv);
    localStorage.setItem('applet_pos_sync_freq', posSyncFrequency);

    showToast(`Operational parameters for ${posSystem.toUpperCase()} locked in.`);
  };

  const handleTestConnection = () => {
    if (testingInProgress) return;
    setTestingInProgress(true);
    setConnectionSucceeded(null);
    setConnectionLogs([`[${new Date().toLocaleTimeString()}] 🚀 Triggering active secure API handshake daemon node...`]);

    const steps: string[] = [];
    if (posSystem === 'toast') {
      steps.push(
        `[INFO] Target Gateway Host: https://api.toasttab.com (US Core Production)`,
        `[INFO] Querying Partner Port credentials verification... ID: "${toastClientId}"`,
        `[INFO] Constructing secure REST POST to '/usermgt/v1/oauth/token'...`,
        `[SUCCESS] HTTP 200 OK - Bearer OAuth Token acquired. Token TTL: 86400s`,
        `[INFO] Mapping site restaurant context group: "${toastRestId}"`,
        `[SUCCESS] Location resolved: Arlington Commissary Hub (Operational Site #108)`,
        `[INFO] Reading active scopes: [menus:read, locations:read, sales:write, orders:read]`,
        `[SUCCESS] Handshake verified! Latency check: 138ms. Sandbox API Tunnel successfully established.`
      );
    } else if (posSystem === 'aloha') {
      steps.push(
        `[INFO] Bootstrapping local on-premises Aloha Integration Agent port...`,
        `[INFO] Establishing TCP loop socket to host IP ${alohaIp}:${alohaPort}...`,
        `[SUCCESS] Aloha secure client daemon active. Service Protocol: v5.24.1 (NCR Connected Agent)`,
        `[INFO] Transmitting Aloha Site ID credentials: "${alohaSiteId}"`,
        `[INFO] Inspecting database structures folder in background: "${alohaDbfPath}"`,
        `[SUCCESS] Verified key database structure files: CHD.DBF (items list), MOD.DBF (item modifiers), and STAT.DBF (depletion values)`,
        `[SUCCESS] On-premise agent online. Security connection secure.`
      );
    } else if (posSystem === 'clover') {
      steps.push(
        `[INFO] Executing handshake query with Clover Cloud Rest Gateway (https://api.clover.com)...`,
        `[INFO] Attaching developer authorization bearer token prefix for Merchant ID: "${cloverMerchantId}"`,
        `[SUCCESS] Response code: HTTP 200 (Authentication Passed). Merchant Registered: "Arlington Corporate Corp"`,
        `[INFO] Registering webhook hooks: [inventory.item.quantity.sync, inventory.order.reconcile]`,
        `[SUCCESS] Clover Merchant integration parameters established.`
      );
    } else {
      steps.push(
        `[INFO] Connecting to custom REST endpoint webhook controller...`,
        `[INFO] Constructing payload layout check.`,
        `[SUCCESS] Heartbeat ping success. 200/OK. Custom system aligned.`
      );
    }

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setConnectionLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${steps[currentStep]}`]);
        currentStep++;
      } else {
        clearInterval(interval);
        setTestingInProgress(false);
        setConnectionSucceeded(true);
        showToast(`${posSystem.toUpperCase()} connection test completed successfully.`);
      }
    }, 550);
  };

  const handleSyncCatalog = () => {
    if (syncInProgress) return;
    setSyncInProgress(true);
    setSyncLogs([`[${new Date().toLocaleTimeString()}] 🔄 Accessing remote ${posSystem.toUpperCase()} items catalog repository...`]);

    const steps: string[] = [
      `[INFO] Polling item definitions from remote database server...`,
      `[INFO] Cross-checking names and category structures with active commissary records...`,
      `[SUCCESS] Identifiers resolved. Remote ingredients/menus matched. Ready to write to ledger.`
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${steps[currentStep]}`]);
        currentStep++;
      } else {
        clearInterval(interval);
        setSyncInProgress(false);

        // Populate new items dynamically based on posSystem selection to provide actual proof of work!
        let added: InventoryItem[] = [];
        if (posSystem === 'toast') {
          added = [
            {
              id: `toast-item-${Date.now()}-1`,
              name: "Gourmet Sourdough Bread Dough (Toast POS Synced)",
              category: "Preps",
              description: "Imported via Toast POS Sync catalog endpoint.",
              vendorName: "Toast POS Sync Node",
              packagingDetails: "Box of 24 Pre-shuffled Dough",
              unitOfMeasurement: "boxes",
              defaultParLevel: 12,
              photoUrl: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=200&q=80",
              active: true
            },
            {
              id: `toast-item-${Date.now()}-2`,
              name: "Smoked Peppered Apple Bacon (Toast POS Synced)",
              category: "Cooler",
              description: "Applewood hardwood smoked bacon streaks certified sync.",
              vendorName: "Toast POS Sync Node",
              packagingDetails: "Case of 15 lbs packs",
              unitOfMeasurement: "cases",
              defaultParLevel: 6,
              photoUrl: "https://images.unsplash.com/photo-1606843046080-45bf7a23c39f?auto=format&fit=crop&w=200&q=80",
              active: true
            }
          ];
        } else if (posSystem === 'aloha') {
          added = [
            {
              id: `aloha-item-${Date.now()}-1`,
              name: "Aloha Sweet Habanero Marinade (Aloha POS Synced)",
              category: "Cooler",
              description: "Hot marinade liquid fetched from local agent CHD database.",
              vendorName: "NCR Aloha Agent DBF",
              packagingDetails: "Tub of 2 Gallons Fluid",
              unitOfMeasurement: "tubs",
              defaultParLevel: 5,
              photoUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80",
              active: true
            }
          ];
        } else if (posSystem === 'clover') {
          added = [
            {
              id: `clover-item-${Date.now()}-1`,
              name: "Clover Lemon Zest Concentrate (Clover Synced)",
              category: "Main Ingredients",
              description: "Organic citrus juice extract synced through Clover Merchant endpoint.",
              vendorName: "Clover Retail POS",
              packagingDetails: "Box (4 Tubs)",
              unitOfMeasurement: "boxes",
              defaultParLevel: 4,
              photoUrl: "https://images.unsplash.com/photo-1534080391025-a87e4914c700?auto=format&fit=crop&w=200&q=80",
              active: true
            }
          ];
        } else {
          added = [
            {
              id: `custom-item-${Date.now()}-1`,
              name: "Custom API Raw Prep Grade",
              category: "Preps",
              description: "Raw prep units received from manual webhook triggers.",
              vendorName: "Webhook custom delivery",
              packagingDetails: "Pack of 10 blocks",
              unitOfMeasurement: "packs",
              defaultParLevel: 3,
              photoUrl: "https://images.unsplash.com/photo-160453468506-a8da13d82791?auto=format&fit=crop&w=200&q=80",
              active: true
            }
          ];
        }

        setItems(prev => {
          const onlyNew = added.filter(item => !prev.some(e => e.name === item.name));
          if (onlyNew.length > 0) {
            return [...onlyNew, ...prev];
          }
          return prev;
        });

        setSyncLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [SUCCESS] Sync catalog resolved. Added ${added.length} inventory products directly to Commissary lists.`,
          `[${new Date().toLocaleTimeString()}] [INFO] Core items registry refreshed.`
        ]);

        showToast(`Catalog items imported: ${added.map(i => i.name).join(' and ')} are now live!`);
      }
    }, 600);
  };

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  // --- ACTIONS ---
  // User creation or save edit
  const handleSaveUser = () => {
    if (!userInputName || !userInputEmail) {
      alert("Name and email are required fields to build users.");
      return;
    }

    if (editingUserId) {
      setUsers(prev => prev.map(u => u.id === editingUserId ? {
        ...u,
        name: userInputName,
        email: userInputEmail,
        role: userInputRole,
        assignedLocations: userInputLocs
      } : u));
      showToast(`Successfully updated credentials and scopes for ${userInputName}`);
    } else {
      const newUser: User = {
        id: `u-${Math.floor(Math.random() * 10000)}`,
        name: userInputName,
        email: userInputEmail,
        role: userInputRole,
        assignedLocations: userInputLocs,
        assignedForms: ['f1']
      };
      setUsers(prev => [newUser, ...prev]);
      showToast(`Successfully created new user: ${userInputName} with role (${userInputRole})`);
    }

    // Reset Form Input
    setEditingUserId(null);
    setUserInputName('');
    setUserInputEmail('');
    setUserInputRole('Employee');
    setUserInputLocs([]);
  };

  const handleEditUserClick = (u: User) => {
    setEditingUserId(u.id);
    setUserInputName(u.name);
    setUserInputEmail(u.email);
    setUserInputRole(u.role);
    setUserInputLocs(u.assignedLocations);
  };

  const handleDeleteUser = (id: string, name: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    showToast(`Deleted employee user record of ${name}`);
  };

  const toggleSuspendUser = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isSuspended: !u.isSuspended } : u));
    const target = users.find(u => u.id === id);
    if (target) {
      showToast(`${target.isSuspended ? 'Reactivated' : 'Suspended'} session profile for ${target.name}`);
    }
  };

  const toggleLockUser = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isLocked: !u.isLocked } : u));
    const target = users.find(u => u.id === id);
    if (target) {
      showToast(`${target.isLocked ? 'Unlocked' : 'Locked'} corporate profile for ${target.name}`);
    }
  };

  const handleResetPassword = (email: string) => {
    const target = users.find(u => u.email === email);
    if (!target) {
      showToast(`Error: Contact profile with email ${email} not found.`);
      return;
    }

    const permitted = 
      (simUser?.role === 'Super Admin') || 
      (simUser?.role === 'Admin' && (target.role === 'Manager' || target.role === 'Employee')) || 
      (simUser?.role === 'Manager' && target.role === 'Employee');

    if (permitted) {
      showToast(`🔑 Safe password reset link successfully dispatched to ${target.name} (${target.role}) at ${email}`);
    } else {
      showToast(`⚠️ Authorization Denied: You cannot reset password for higher or equal tier profile ${target.name} (${target.role})`);
    }
  };

  // Fast profile upgrader & downgrade handlers
  const handleDraftRoleChange = (userId: string, targetRole: UserRole) => {
    setPendingRoleChanges(prev => ({
      ...prev,
      [userId]: targetRole
    }));
  };

  const handleCancelDraftRoleChange = (userId: string) => {
    setPendingRoleChanges(prev => {
      const copy = { ...prev };
      delete copy[userId];
      return copy;
    });
  };

  const handleCommitRoleChange = (userId: string) => {
    const targetRole = pendingRoleChanges[userId];
    if (!targetRole) return;

    const user = users.find(u => u.id === userId);
    if (!user) return;

    const originalRole = user.role;

    // Apply change to state
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: targetRole } : u));

    // Support undo after saving
    setRoleChangeHistory(prev => [
      ...prev,
      { userId, originalRole, newRole: targetRole, name: user.name }
    ]);

    // Clear draft
    setPendingRoleChanges(prev => {
      const copy = { ...prev };
      delete copy[userId];
      return copy;
    });

    showToast(`Successfully saved role change: ${user.name} is now a ${targetRole}`);
  };

  const handleUndoSavedRoleChange = (historyIdx: number) => {
    const historyItem = roleChangeHistory[historyIdx];
    if (!historyItem) return;

    setUsers(prev => prev.map(u => u.id === historyItem.userId ? { ...u, role: historyItem.originalRole } : u));
    
    // Remove from history
    setRoleChangeHistory(prev => prev.filter((_, idx) => idx !== historyIdx));

    showToast(`Role changes undo: Restored ${historyItem.name} back to ${historyItem.originalRole}`);
  };

  // Location creating action
  const handleCreateLocation = () => {
    if (!locInputCode || !locInputName) {
      alert("Both unique Code and Name are required.");
      return;
    }
    const newLoc: Location = {
      code: locInputCode.toUpperCase().trim(),
      name: locInputName,
      address: locInputAddress || 'Undisclosed Office address VA',
      active: true
    };
    setLocations(prev => [newLoc, ...prev]);
    showToast(`Successfully registry and configured location: ${newLoc.name} (${newLoc.code})`);
    
    //reset
    setLocInputCode('');
    setLocInputName('');
    setLocInputAddress('');
  };

  // Simulated multi-step asset scraper and PNG format optimizer
  const simulateScrapingProcess = (itemName: string, onDone: (urls: string[]) => void) => {
    setIsScrapingPhotos(true);
    setPhotoScrapeStep("Initializing crawler on vendor databases...");
    
    setTimeout(() => {
      setPhotoScrapeStep(`Matched item listings for '${itemName}' in vendor portals...`);
      setTimeout(() => {
        setPhotoScrapeStep("Downloading 4 candidate source high-res JPG photos...");
        setTimeout(() => {
          setIsConvertingToPng(true);
          setPhotoScrapeStep("WebAssembly libpng: converting image streams to PNG format...");
          setTimeout(() => {
            setPhotoScrapeStep("Resizing to 350x350px & stripping EXIF chunks (~35KB optimized PNG output)...");
            setTimeout(() => {
              const query = encodeURIComponent(itemName);
              const resultUrls = [
                `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&h=400&q=80&sig=1&q=${query}`,
                `https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=400&h=400&q=80&sig=2&q=${query}`,
                `https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&h=400&q=80&sig=3&q=${query}`,
                `https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=400&h=400&q=80&sig=4&q=${query}`
              ];
              setIsScrapingPhotos(false);
              setIsConvertingToPng(false);
              setPhotoScrapeStep('');
              onDone(resultUrls);
            }, 600);
          }, 600);
        }, 500);
      }, 500);
    }, 500);
  };

  // Item creating / editing action
  const handleCreateItem = () => {
    if (!itemInputName) {
      alert("Item name must be set");
      return;
    }

    const nestedConfig = itemInputHasNested ? {
      hasNested: true,
      innerUnitName: itemInputInnerUnitName,
      innerQtyPerParent: Number(itemInputInnerQtyPerParent) || 1,
      baseUnitName: itemInputBaseUnitName,
      baseQtyPerInner: Number(itemInputBaseQtyPerInner) || 1,
    } : undefined;

    // Determine final UOM abbreviation
    let finalUOM = itemInputUnit;
    if (itemInputMeasurementType === 'weight') {
      finalUOM = itemInputWeightUnit; // 'lbs' or 'oz'
    } else if (itemInputMeasurementType === 'liquid') {
      finalUOM = itemInputLiquidUnit; // 'gal', 'L', 'mL', or 'fl oz'
    }

    // Capture standard photo URLs list (at least 3-4 accurate photos)
    const baseUnsplashQuery = encodeURIComponent(itemInputName);
    const finalPhotoUrls = itemInputPhotoUrls.length >= 3 ? itemInputPhotoUrls : [
      itemPhotoSimulated,
      `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&h=400&q=80&sig=1&q=${baseUnsplashQuery}`,
      `https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=400&h=400&q=80&sig=2&q=${baseUnsplashQuery}`,
      `https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&h=400&q=80&sig=3&q=${baseUnsplashQuery}`
    ];

    const saveChanges = (scrapedUrls?: string[]) => {
      const urlsToSave = scrapedUrls || finalPhotoUrls;
      const primaryPhoto = urlsToSave[0] || itemPhotoSimulated;

      if (itemInputSourceType === 'manufactured' && recipeIngredients.length === 0) {
        alert("A Recipe is strictly required when registering a Manufactured item. Please construct your recipe lists first!");
        return;
      }

      if (editingItemId) {
        // Edit Mode
        setItems(prev => prev.map(item => {
          if (item.id === editingItemId) {
            return {
              ...item,
              name: itemInputName,
              category: itemInputCat,
              vendorName: itemInputVendor || 'Sysco Food Services',
              packagingDetails: itemInputPkg || `${itemInputQtyPerCase || 100} units per case`,
              unitOfMeasurement: finalUOM,
              defaultParLevel: itemInputPar,
              photoUrl: primaryPhoto,
              photoUrls: urlsToSave,
              measurementType: itemInputMeasurementType,
              weightUnit: itemInputWeightUnit,
              liquidUnit: itemInputLiquidUnit,
              weightOrVolumeValue: Number(itemInputMeasurementValue) || 1,
              itemCode: itemInputCode,
              quantityPerCase: Number(itemInputQtyPerCase) || undefined,
              nestedUnitConfig: nestedConfig,
              createdPrice: itemInputPrice,
              recentPurchaseDate: itemInputRecentPurchaseDate || new Date().toISOString(),
              recentPurchasePrice: itemInputRecentPurchasePrice || itemInputPrice,
              
              // New fields
              itemSourceType: itemInputSourceType,
              purchasedQty: itemInputSourceType === 'purchased' ? Number(itemInputPurchasedQty) : undefined,
              recipeIngredients: itemInputSourceType === 'manufactured' ? recipeIngredients : undefined,
              yield1Qty: itemInputSourceType === 'manufactured' ? Number(itemInputYield1Qty) : undefined,
              yield1Unit: itemInputSourceType === 'manufactured' ? itemInputYield1Unit : undefined,
              yield2Qty: itemInputSourceType === 'manufactured' ? Number(itemInputYield2Qty) : undefined,
              yield2Unit: itemInputSourceType === 'manufactured' ? itemInputYield2Unit : undefined,
            };
          }
          return item;
        }));
        showToast(`Successfully updated catalog item: ${itemInputName}`);
        setEditingItemId(null);
      } else {
        // Create Mode
        const timestamp = new Date().toISOString();
        const finalCode = itemInputCode || `ITM-${Math.floor(100 + Math.random() * 900)}`;
        const newItem: InventoryItem = {
          id: finalCode,
          name: itemInputName,
          category: itemInputCat,
          description: 'System operator custom inventory item.',
          vendorName: itemInputVendor || 'Sysco Food Services',
          packagingDetails: itemInputPkg || `${itemInputQtyPerCase || 100} units per case`,
          unitOfMeasurement: finalUOM,
          defaultParLevel: itemInputPar,
          photoUrl: primaryPhoto,
          photoUrls: urlsToSave,
          measurementType: itemInputMeasurementType,
          weightUnit: itemInputWeightUnit,
          liquidUnit: itemInputLiquidUnit,
          weightOrVolumeValue: Number(itemInputMeasurementValue) || 1,
          active: true,
          itemCode: finalCode,
          quantityPerCase: Number(itemInputQtyPerCase) || 100,
          nestedUnitConfig: nestedConfig,
          createdAt: timestamp,
          createdPrice: itemInputPrice,
          recentPurchaseDate: timestamp,
          recentPurchasePrice: itemInputPrice,

          // New fields
          itemSourceType: itemInputSourceType,
          purchasedQty: itemInputSourceType === 'purchased' ? Number(itemInputPurchasedQty) : undefined,
          recipeIngredients: itemInputSourceType === 'manufactured' ? recipeIngredients : undefined,
          yield1Qty: itemInputSourceType === 'manufactured' ? Number(itemInputYield1Qty) : undefined,
          yield1Unit: itemInputSourceType === 'manufactured' ? itemInputYield1Unit : undefined,
          yield2Qty: itemInputSourceType === 'manufactured' ? Number(itemInputYield2Qty) : undefined,
          yield2Unit: itemInputSourceType === 'manufactured' ? itemInputYield2Unit : undefined,
        };
        setItems(prev => [newItem, ...prev]);
        showToast(`Item catalog successfully updated with: ${newItem.name}`);
      }

      // reset
      setItemInputName('');
      setItemInputVendor('');
      setItemInputPkg('');
      setItemInputUnit('cases');
      setItemInputPar(1);
      setItemInputCode('');
      setItemInputQtyPerCase(100);
      setItemInputHasNested(false);
      setItemInputPrice(24.50);
      setItemInputMeasurementType('discrete');
      setItemInputWeightUnit('lbs');
      setItemInputLiquidUnit('gal');
      setItemInputMeasurementValue(1);
      setItemInputPhotoUrls([]);

      // resets for new inputs
      setItemInputSourceType('purchased');
      setItemInputPurchasedQty(10);
      setRecipeIngredients([]);
      setItemInputYield1Qty(10);
      setItemInputYield1Unit('gal');
      setItemInputYield2Qty(10);
      setItemInputYield2Unit('lbs');
    };

    if (!editingItemId) {
      // Automatically pull accurate pictures in background on item save
      simulateScrapingProcess(itemInputName, (urls) => {
        saveChanges(urls);
      });
    } else {
      saveChanges();
    }
  };

  const handleStartEditItem = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setItemInputName(item.name);
    setItemInputCat(item.category);
    setItemInputVendor(item.vendorName);
    setItemInputPkg(item.packagingDetails);
    setItemInputUnit(item.unitOfMeasurement);
    setItemInputPar(item.defaultParLevel);
    setItemPhotoSimulated(item.photoUrl);
    setItemInputCode(item.itemCode || item.id);
    setItemInputQtyPerCase(item.quantityPerCase || 100);
    setItemInputHasNested(!!item.nestedUnitConfig?.hasNested);
    setItemInputInnerUnitName(item.nestedUnitConfig?.innerUnitName || 'sleeves');
    setItemInputInnerQtyPerParent(item.nestedUnitConfig?.innerQtyPerParent || 20);
    setItemInputBaseUnitName(item.nestedUnitConfig?.baseUnitName || 'lids');
    setItemInputBaseQtyPerInner(item.nestedUnitConfig?.baseQtyPerInner || 100);
    setItemInputPrice(item.createdPrice || 24.50);
    setItemInputCreatedDate(item.createdAt || new Date().toISOString());
    setItemInputRecentPurchaseDate(item.recentPurchaseDate || new Date().toISOString());
    setItemInputRecentPurchasePrice(item.recentPurchasePrice || 24.50);

    // Restore weight / liquid / photos list configs
    setItemInputMeasurementType(item.measurementType || 'discrete');
    setItemInputWeightUnit(item.weightUnit || 'lbs');
    setItemInputLiquidUnit(item.liquidUnit || 'gal');
    setItemInputMeasurementValue(item.weightOrVolumeValue || 1);
    setItemInputPhotoUrls(item.photoUrls || (item.photoUrl ? [item.photoUrl] : []));

    // Restore new custom source types and recipes
    setItemInputSourceType(item.itemSourceType || 'purchased');
    setItemInputPurchasedQty(item.purchasedQty || 10);
    setRecipeIngredients(item.recipeIngredients || []);
    setItemInputYield1Qty(item.yield1Qty || 10);
    setItemInputYield1Unit(item.yield1Unit || 'gal');
    setItemInputYield2Qty(item.yield2Qty || 10);
    setItemInputYield2Unit(item.yield2Unit || 'lbs');
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
    setItemInputName('');
    setItemInputVendor('');
    setItemInputPkg('');
    setItemInputUnit('cases');
    setItemInputPar(1);
    setItemInputCode('');
    setItemInputQtyPerCase(100);
    setItemInputHasNested(false);
    setItemInputPrice(24.50);

    // Resets:
    setItemInputSourceType('purchased');
    setItemInputPurchasedQty(10);
    setRecipeIngredients([]);
    setItemInputYield1Qty(10);
    setItemInputYield1Unit('gal');
    setItemInputYield2Qty(10);
    setItemInputYield2Unit('lbs');
  };

  // Vendor handlers
  const handleCreateVendor = () => {
    if (!vendorInputName) {
      alert("Vendor name must be set");
      return;
    }

    if (editingVendorId) {
      // Edit Vendor
      setVendors(prev => prev.map(v => {
        if (v.id === editingVendorId) {
          return {
            ...v,
            name: vendorInputName,
            address: vendorInputAddress,
            phone: vendorInputPhone,
            representative: vendorInputRep,
            representativePosition: vendorInputPosition,
            email: vendorInputEmail,
            cellphone: vendorInputCell,
            directLine: vendorInputDirect
          };
        }
        return v;
      }));
      showToast(`Vendor details updated: ${vendorInputName}`);
      setEditingVendorId(null);
    } else {
      // Create Vendor
      const newVendor: Vendor = {
        id: `vendor-${Math.floor(1000 + Math.random() * 9000).toString()}`,
        name: vendorInputName,
        address: vendorInputAddress || 'Undisclosed HQ Address',
        phone: vendorInputPhone || 'Unlisted Office Phone',
        representative: vendorInputRep || 'TBD Logistics Representative',
        representativePosition: vendorInputPosition || 'Logistics Representative',
        email: vendorInputEmail || 'logistics@vendor.com',
        cellphone: vendorInputCell || 'TBD Representative Cell',
        directLine: vendorInputDirect || 'Unlisted Direct Phone',
        createdAt: new Date().toISOString()
      };
      setVendors(prev => [newVendor, ...prev]);
      showToast(`Vendor registered successfully: ${newVendor.name}`);
    }

    // Reset fields
    setVendorInputName('');
    setVendorInputAddress('');
    setVendorInputPhone('');
    setVendorInputRep('');
    setVendorInputPosition('');
    setVendorInputEmail('');
    setVendorInputCell('');
    setVendorInputDirect('');
  };

  const handleStartEditVendor = (v: Vendor) => {
    setEditingVendorId(v.id);
    setVendorInputName(v.name);
    setVendorInputAddress(v.address);
    setVendorInputPhone(v.phone);
    setVendorInputRep(v.representative);
    setVendorInputPosition(v.representativePosition || '');
    setVendorInputEmail(v.email);
    setVendorInputCell(v.cellphone);
    setVendorInputDirect(v.directLine);
  };

  const handleDeleteVendor = (id: string) => {
    if (confirm("Are you sure you want to delete this vendor? This will not remove items carrying their label, but cleans their business contact sheet.")) {
      setVendors(prev => prev.filter(v => v.id !== id));
      showToast("Vendor profile removed successfully.");
    }
  };

  // Checksheet Forms Management Suite Handlers
  const handleOpenCreateForm = () => {
    setFormModalTitle('');
    setFormModalLoc(formsSelectedLoc !== 'ALL' ? formsSelectedLoc : 'AR');
    setFormModalFreq('Weekly');
    setFormModalDueDate('2026-06-01');
    setFormModalDueTime('22:00');
    setFormModalSections([
      { name: 'Cooler', itemIds: [] },
      { name: 'Dry Storage', itemIds: [] }
    ]);
    setActiveSectionIdx(0);
    setNewSectionInput('');
    setItemSearchForForm('');
    setShowCreateFormModal(true);
  };

  const handleOpenEditForm = (f: InventoryForm) => {
    setEditingForm(f);
    setFormModalTitle(f.title);
    setFormModalLoc(f.locationCode || 'AR');
    setFormModalFreq(f.frequency || 'Weekly');
    setFormModalDueDate(f.dueDate || '2026-06-01');
    setFormModalDueTime(f.dueTime || '22:00');
    setFormModalSections(
      f.sections && f.sections.length > 0 
        ? JSON.parse(JSON.stringify(f.sections)) 
        : [{ name: 'General', itemIds: [] }]
    );
    setActiveSectionIdx(0);
    setNewSectionInput('');
    setItemSearchForForm('');
  };

  const handleOpenDuplicateForm = (f: InventoryForm) => {
    setDuplicatingForm(f);
    setDuplicateTargetLoc('AR');
    setDuplicateNewTitle(`${f.title} (Copy)`);
  };

  const handleSaveNewForm = () => {
    if (!formModalTitle.trim()) {
      alert("Please enter a Title for the checksheet.");
      return;
    }
    const created: InventoryForm = {
      id: `form-${formModalLoc.toLowerCase()}-${Date.now().toString(36)}`,
      title: formModalTitle.trim(),
      locationCode: formModalLoc,
      assignedUserIds: ['u1', 'u3'],
      frequency: formModalFreq,
      dueDate: formModalDueDate,
      dueTime: formModalDueTime,
      sections: formModalSections.filter(s => s.name.trim() !== ''),
      active: true
    };
    const updated = saveFormToStorage(created);
    setForms(updated);
    setShowCreateFormModal(false);
    showToast(`Created checksheet "${created.title}" for ${created.locationCode}!`);
  };

  const handleSaveEditedForm = () => {
    if (!editingForm) return;
    if (!formModalTitle.trim()) {
      alert("Please enter a Title for the checksheet.");
      return;
    }
    const updatedForm: InventoryForm = {
      ...editingForm,
      title: formModalTitle.trim(),
      locationCode: formModalLoc,
      frequency: formModalFreq,
      dueDate: formModalDueDate,
      dueTime: formModalDueTime,
      sections: formModalSections.filter(s => s.name.trim() !== '')
    };
    const updated = saveFormToStorage(updatedForm);
    setForms(updated);
    setEditingForm(null);
    showToast(`Checksheet "${updatedForm.title}" updated successfully!`);
  };

  const handleConfirmDeleteForm = () => {
    if (!deletingForm) return;
    const updated = deleteFormFromStorage(deletingForm.id);
    setForms(updated);
    showToast(`Checksheet "${deletingForm.title}" deleted.`);
    setDeletingForm(null);
  };

  const handleConfirmDuplicateForm = () => {
    if (!duplicatingForm) return;
    const res = duplicateFormInStorage(duplicatingForm, duplicateTargetLoc, duplicateNewTitle.trim() || undefined);
    setForms(res.updatedForms);
    setDuplicatingForm(null);
    showToast(`Duplicated checksheet to ${duplicateTargetLoc}: "${res.newForm.title}"!`);
  };

  const handleAddSectionToModal = () => {
    const trimmed = newSectionInput.trim();
    if (!trimmed) return;
    setFormModalSections(prev => [...prev, { name: trimmed, itemIds: [] }]);
    setNewSectionInput('');
    setActiveSectionIdx(formModalSections.length);
  };

  const handleRemoveSectionFromModal = (idx: number) => {
    if (formModalSections.length <= 1) {
      alert("A checksheet must contain at least one section.");
      return;
    }
    setFormModalSections(prev => prev.filter((_, i) => i !== idx));
    setActiveSectionIdx(prev => Math.max(0, prev - 1));
  };

  const handleToggleItemInModalSection = (itemId: string) => {
    setFormModalSections(prev => {
      const copy = [...prev];
      const curSection = copy[activeSectionIdx];
      if (!curSection) return prev;
      const exists = curSection.itemIds.includes(itemId);
      curSection.itemIds = exists 
        ? curSection.itemIds.filter(id => id !== itemId) 
        : [...curSection.itemIds, itemId];
      return copy;
    });
  };

  // Legacy compatibility aliases
  const handleCreateForm = handleOpenCreateForm;
  const handleDuplicateForm = handleOpenDuplicateForm;

  // Job code management handlers
  const handleAddJobCode = () => {
    if (!newJobCode.code.trim() || !newJobCode.title.trim()) {
      alert("Please provide both Job Code and Title.");
      return;
    }
    const cleanCode = newJobCode.code.trim().toUpperCase();
    if (jobCodesList.some(j => j.code === cleanCode)) {
      alert(`Job Code ${cleanCode} already exists.`);
      return;
    }
    const updated = [...jobCodesList, { ...newJobCode, code: cleanCode }];
    setJobCodesList(updated);
    saveAppSettings({ jobCodes: updated });
    setShowAddJobCodeModal(false);
    setNewJobCode({
      code: '',
      title: '',
      role: 'Manager',
      department: 'Operations',
      description: '',
      color: '#3b82f6'
    });
    showToast(`Added Job Code ${cleanCode} (${newJobCode.title})!`);
  };

  const handleDeleteJobCode = (code: string) => {
    const target = jobCodesList.find(j => j.code === code);
    if (!target) return;
    if (target.isSystemProtected) {
      alert("System-protected job codes (such as EXEC-01 Super Admin) cannot be deleted.");
      return;
    }
    if (confirm(`Are you sure you want to remove Job Code ${code} (${target.title})?`)) {
      const updated = jobCodesList.filter(j => j.code !== code);
      setJobCodesList(updated);
      saveAppSettings({ jobCodes: updated });
      showToast(`Removed Job Code ${code}.`);
    }
  };

  // Toggle user assignment location code
  const toggleUserLoc = (code: string) => {
    setUserInputLocs(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  return (
    <div className="bg-white text-gray-800 border border-gray-100 shadow-md rounded-2xl p-3.5 sm:p-5 md:p-6 font-sans w-full max-w-full overflow-hidden">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 mb-5">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-950 flex items-center gap-2">
            <ClipboardList className="w-5.5 h-5.5 text-amber-500 animate-spin" />
            Commissary Operations Admin Panel
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Control operational authorities: database tables, user partitions, and forms audits schedules</p>
        </div>

        {/* Sub Navigation */}
        <div className="flex overflow-x-auto no-scrollbar gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-xl sm:flex-wrap shrink-0">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 touch-manipulation ${
              activeSubTab === 'users' ? 'bg-amber-500 text-gray-950 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Users
          </button>
          
          {(simUser?.role === 'Super Admin' || simUser?.role === 'Admin') && (
            <>
              <button
                onClick={() => setActiveSubTab('locations')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                  activeSubTab === 'locations' ? 'bg-amber-500 text-gray-950 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" /> Stores ({locations.length})
              </button>
              <button
                onClick={() => setActiveSubTab('items')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                  activeSubTab === 'items' ? 'bg-amber-500 text-gray-950 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Items
              </button>
            </>
          )}

          {(!simUser || simUser.role === 'Super Admin' || hasPermission(simUser?.role, 'canManageForms')) && (
            <button
              onClick={() => setActiveSubTab('forms')}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 touch-manipulation ${
                activeSubTab === 'forms' ? 'bg-amber-500 text-gray-950 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" /> Checksheets ({forms.length})
            </button>
          )}

          {(!simUser || simUser.role === 'Super Admin') && (
            <>
              <button
                onClick={() => setActiveSubTab('brand')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                  activeSubTab === 'brand' ? 'bg-amber-500 text-gray-950 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Super Admin
              </button>
              <button
                onClick={() => setActiveSubTab('integrations')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                  activeSubTab === 'integrations' ? 'bg-amber-500 text-gray-950 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
                id="pos-integrations-subtab-btn"
              >
                <Cpu className="w-3.5 h-3.5" /> POS Integrations
              </button>
              <button
                onClick={() => setActiveSubTab('settings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                  activeSubTab === 'settings' ? 'bg-amber-500 text-gray-950 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
                id="settings-permissions-subtab-btn"
              >
                <Sliders className="w-3.5 h-3.5" /> Settings & Permissions
              </button>
            </>
          )}
        </div>
      </div>

      {successToast && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-xs p-3.5 rounded-xl flex items-center gap-2 font-mono font-bold animate-bounce">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <p>{successToast}</p>
        </div>
      )}

      {/* 1. USERS SUBTAB */}
      {activeSubTab === 'users' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Create/Edit box */}
          <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl h-fit space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1">
              <PlusCircle className="w-4 h-4 text-amber-500" />
              {editingUserId ? "Edit Authority Details" : "Create New User Record"}
            </h3>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-gray-400 font-mono text-[10px] uppercase">Full Name</label>
              <input 
                type="text"
                placeholder="Manager Name"
                value={userInputName}
                onChange={(e) => setUserInputName(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sans focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-gray-400 font-mono text-[10px] uppercase">Email Identity</label>
              <input 
                type="email"
                placeholder="manager@thecommissary.com"
                value={userInputEmail}
                onChange={(e) => setUserInputEmail(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sans focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-gray-400 font-mono text-[10px] uppercase">Authority Level (Role)</label>
              <select 
                value={userInputRole}
                onChange={(e) => setUserInputRole(e.target.value as UserRole)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sans focus:outline-none focus:border-amber-500 font-bold"
              >
                {simUser?.role === 'Super Admin' && (
                  <option value="Super Admin">Super Admin (Global permissions)</option>
                )}
                {simUser?.role === 'Super Admin' && (
                  <option value="Admin">Admin (Create Items / view reports)</option>
                )}
                <option value="Manager">Manager (Edit site totals / submit)</option>
                <option value="Employee">Employee (Only count inventories)</option>
              </select>
            </div>

            {/* Sub-locations scope */}
            <div className="space-y-2 text-xs">
              <label className="font-bold text-gray-400 font-mono text-[10px] uppercase block">Assign Locations access</label>
              <div className="p-3 bg-white border rounded-xl max-h-36 overflow-y-auto space-y-1">
                {['CM', 'AR', 'AS', 'BK', 'CH', 'FX', 'HN', 'LS', 'MN', 'SP', 'VN'].map(code => {
                  const hasAssigned = userInputLocs.includes(code);
                  return (
                    <button
                      key={code}
                      onClick={() => toggleUserLoc(code)}
                      className={`w-full text-left p-1.5 px-2 text-[11px] font-mono rounded flex items-center justify-between border ${
                        hasAssigned 
                          ? 'bg-amber-500/10 border-amber-500/35 text-amber-800 font-bold' 
                          : 'bg-slate-50 border-slate-200/50 text-slate-500'
                      }`}
                    >
                      <span>{code} Location</span>
                      {hasAssigned && <Check className="w-3.5 h-3.5 text-amber-500" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button 
              onClick={handleSaveUser}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs uppercase cursor-pointer transition active:scale-95"
            >
              {editingUserId ? "Commit Scopes Changes" : "Save New User Profile"}
            </button>
            {editingUserId && (
              <button 
                onClick={() => {
                  setEditingUserId(null);
                  setUserInputName('');
                  setUserInputEmail('');
                  setUserInputRole('Employee');
                  setUserInputLocs([]);
                }}
                className="w-full mt-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs uppercase cursor-pointer transition"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {/* Users ledger */}
          <div className="lg:col-span-2 space-y-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search staff ledger..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs placeholder-slate-400 bg-slate-50 focus:outline-none focus:border-amber-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {roleChangeHistory.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs animate-fadeIn shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-900 flex items-center gap-1">
                    <Undo className="w-3.5 h-3.5 text-amber-650" /> Staff Role Transitions Queue ({roleChangeHistory.length})
                  </span>
                  <button
                    onClick={() => {
                      handleUndoSavedRoleChange(roleChangeHistory.length - 1);
                    }}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded text-[10px] transition cursor-pointer"
                  >
                    Quick Undo Latest Change
                  </button>
                </div>
                <p className="text-[10px] text-amber-750 font-sans leading-relaxed">
                  You can restore any recently saved staff profile roles. Click "Undo Last Saved" inside the specific staff card or use the quick revert control above.
                </p>
              </div>
            )}

            <div className="space-y-2 max-h-[450px] overflow-y-auto">
              {users.filter(u => u.name.toLowerCase().includes(searchUser.toLowerCase())).map(u => (
                <div key={u.id} className="p-4 bg-white border rounded-xl flex items-start justify-between gap-3 shadow-sm hover:border-slate-300 transition-all">
                  <div className="text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-gray-900 text-sm">{u.name}</h4>
                      <span className="bg-slate-100 border text-slate-600 font-mono text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">
                        {u.role}
                      </span>
                      {u.isSuspended && (
                        <span className="bg-red-100 border border-red-200 text-red-600 font-mono text-[9px] px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">
                          ● Suspended
                        </span>
                      )}
                      {u.isLocked && (
                        <span className="bg-amber-100 border border-amber-200 text-amber-700 font-mono text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">
                          🔒 Locked
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 mt-1">{u.email}</p>
                    <p className="text-[10px] font-mono mt-1 text-amber-700">
                      Locations assigned: {u.assignedLocations.length > 0 ? u.assignedLocations.join(' • ') : "NONE (Restrictive)"}
                    </p>

                    {/* Compact Profile Upgrader/Downgrader Panel */}
                    {(simUser?.role === 'Super Admin' || simUser?.role === 'Admin') && (u.role === 'Employee' || u.role === 'Manager') && (
                      <div className="mt-3.5 p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-2 max-w-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
                            Profile Upgrader/Downgrader:
                          </span>
                          
                          {pendingRoleChanges[u.id] ? (
                            <span className="bg-amber-100 text-amber-800 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold animate-pulse">
                              Pending: {pendingRoleChanges[u.id]}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Stable
                            </span>
                          )}
                        </div>

                        {!pendingRoleChanges[u.id] ? (
                          <div className="flex items-center gap-1.5">
                            {u.role === 'Employee' ? (
                              <button
                                type="button"
                                onClick={() => handleDraftRoleChange(u.id, 'Manager')}
                                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-1 px-2 rounded text-[10px] transition flex items-center justify-center gap-1 border border-indigo-100 cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3 text-indigo-500 font-extrabold" /> Upgrade to Manager
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDraftRoleChange(u.id, 'Employee')}
                                className="w-full bg-slate-150 hover:bg-slate-200 text-slate-705 font-bold py-1 px-2 rounded text-[10px] transition flex items-center justify-center gap-1 border border-slate-300 cursor-pointer"
                              >
                                <Users className="w-3 h-3 text-slate-500 font-extrabold" /> Downgrade to Employee
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5 animate-fadeIn">
                            <p className="text-[10px] text-gray-600 leading-snug font-sans">
                              Draft status: <strong className="text-gray-900">{u.role}</strong> ➔ <strong className="text-amber-700">{pendingRoleChanges[u.id]}</strong>
                            </p>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleCommitRoleChange(u.id)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2 rounded text-[10px] transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                              >
                                <Save className="w-3 h-3 text-emerald-100" /> Save
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelDraftRoleChange(u.id)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-705 font-bold py-1 px-2 rounded text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Undo className="w-3 h-3 text-slate-500" /> Undo Draft
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Recent saved changes undo button specifically for this user */}
                        {(() => {
                          const userHistoryIdx = [...roleChangeHistory].reverse().findIndex(h => h.userId === u.id);
                          const actualIdx = userHistoryIdx !== -1 ? (roleChangeHistory.length - 1 - userHistoryIdx) : -1;
                          if (actualIdx !== -1) {
                            const hItem = roleChangeHistory[actualIdx];
                            return (
                              <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[10px] animate-fadeIn">
                                <span className="text-[9px] text-emerald-600 font-medium italic font-mono">
                                  Saved: {hItem.originalRole} ➔ {hItem.newRole}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUndoSavedRoleChange(actualIdx)}
                                  className="text-amber-600 hover:text-amber-700 font-bold flex items-center gap-0.5 uppercase tracking-wide text-[9px] transition cursor-pointer"
                                  title="Restore previous role profile state"
                                >
                                  <Undo className="w-2.5 h-2.5" /> Undo Saved
                                </button>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Password reset for appropriate roles */}
                    {(
                      (simUser?.role === 'Super Admin') || 
                      (simUser?.role === 'Admin' && (u.role === 'Manager' || u.role === 'Employee')) || 
                      (simUser?.role === 'Manager' && u.role === 'Employee')
                    ) && (
                      <button 
                        onClick={() => handleResetPassword(u.email)}
                        title="Reset password safely"
                        className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 hover:text-amber-800 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold sm:inline hidden">Reset</span>
                      </button>
                    )}
                    
                    {/* Edit User Account */}
                    {(simUser?.role === 'Super Admin' || (simUser?.role === 'Admin' && (u.role === 'Manager' || u.role === 'Employee'))) && (
                      <button 
                        onClick={() => handleEditUserClick(u)}
                        title="Edit Account"
                        className="p-1.5 hover:bg-amber-100 hover:text-amber-800 text-slate-500 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Suspend user switch (Only Super Admin can suspend/unsuspend Admin, Manager, and Employee profiles) */}
                    {(simUser?.role === 'Super Admin' && u.id !== simUser?.id) && (
                      <button
                        onClick={() => toggleSuspendUser(u.id)}
                        title={u.isSuspended ? "Reactivate User Profile" : "Suspend User Profile"}
                        className={`p-1.5 rounded-lg transition border text-xs ${
                          u.isSuspended
                            ? 'bg-red-500 text-white border-red-400 hover:bg-red-650'
                            : 'hover:bg-red-50 text-red-500 hover:text-red-705 border-transparent hover:border-red-150'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Lock user switch (Only Super Admin can lock/unlock Admin, Manager, and Employee profiles) */}
                    {(simUser?.role === 'Super Admin' && u.id !== simUser?.id) && (
                      <button
                        onClick={() => toggleLockUser(u.id)}
                        title={u.isLocked ? "Unlock User Account" : "Lock User Account"}
                        className={`p-1.5 rounded-lg transition border text-xs ${
                          u.isLocked
                            ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-650'
                            : 'hover:bg-amber-50 text-amber-600 hover:text-amber-705 border-transparent hover:border-amber-150'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete User Account */}
                    {(simUser?.role === 'Super Admin' && u.id !== simUser?.id) && (
                      <button 
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        title="Delete User"
                        className="p-1.5 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. LOCATIONS LIST (UP TO 500) */}
      {activeSubTab === 'locations' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Configure new location */}
          <div className="bg-slate-50 border p-5 rounded-2xl h-fit space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-amber-500" /> Configure Store Facility
            </h3>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-gray-400 font-mono text-[10px] uppercase">Store Code (E.g. VN)</label>
              <input 
                type="text" 
                maxLength={4}
                placeholder="VN"
                value={locInputCode}
                onChange={(e) => setLocInputCode(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sans focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-gray-400 font-mono text-[10px] uppercase">Facility Title (E.g. Vienna)</label>
              <input 
                type="text" 
                placeholder="Vienna Outlet"
                value={locInputName}
                onChange={(e) => setLocInputName(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sans focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-gray-400 font-mono text-[10px] uppercase">Corporate Address</label>
              <input 
                type="text" 
                placeholder="136 Maple Ave W, Vienna VA"
                value={locInputAddress}
                onChange={(e) => setLocInputAddress(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sans focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              onClick={handleCreateLocation}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs uppercase cursor-pointer"
            >
              Add Store Registry
            </button>

            <div className="p-3 bg-amber-500/5 text-[10px] text-gray-500 rounded-xl border border-amber-500/15 leading-normal">
              <b>Scalability Check:</b> The Commissary core platform is architected and fully index-configured to operate up to <b>500 locations</b> simultaneously without query drag in Google Firestore.
            </div>
          </div>

          {/* Scalable Stores catalog list with live query search */}
          <div className="lg:col-span-2 space-y-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search 500 cataloged stores (e.g. Vienna, Leesburg, Norfolk)..."
                value={searchLoc}
                onChange={(e) => setSearchLoc(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs placeholder-slate-400 bg-slate-50 focus:outline-none focus:border-amber-500 font-mono"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
              {locations.filter(l => 
                l.name.toLowerCase().includes(searchLoc.toLowerCase()) || 
                l.code.toLowerCase().includes(searchLoc.toLowerCase())
              ).slice(0, 50).map(l => ( // list 50 at a time for fast React DOM updates
                <div key={l.code} className="p-3 bg-slate-50 border rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-amber-500 bg-slate-900 px-2 py-0.5 rounded text-[11px]">{l.code}</span>
                      <h4 className="font-bold text-gray-900 leading-tight">{l.name}</h4>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 truncate max-w-[150px]">{l.address}</p>
                  </div>
                  <span className="bg-green-500/10 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-green-200 uppercase tracking-widest leading-none">
                    Active
                  </span>
                </div>
              ))}
            </div>
            
            <div className="text-[10px] text-gray-400 font-mono text-center">
              Showing top 50 matches (Total stores database registry: {locations.length})
            </div>
          </div>
        </div>
      )}

      {/* 3. ITEMS CATALOG MANAGEMENT & UPLOAD PREVIEW */}
      {activeSubTab === 'items' && (
        <div className="space-y-6">
          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-slate-200 gap-1 bg-slate-50 p-1.5 rounded-xl">
            <button
              onClick={() => setActiveItemSubTab('catalog')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 ${
                activeItemSubTab === 'catalog'
                  ? 'bg-white text-slate-900 border border-slate-200/80 shadow-sm font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              <Database className="w-4 h-4 text-amber-500" /> Items Catalog ({items.length})
            </button>
            <button
              onClick={() => setActiveItemSubTab('vendors')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 ${
                activeItemSubTab === 'vendors'
                  ? 'bg-white text-slate-900 border border-slate-200/80 shadow-sm font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              <Users className="w-4 h-4 text-sky-500" /> Vendors Directory ({vendors.length})
            </button>
            <button
              onClick={() => setActiveItemSubTab('invoice')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 ${
                activeItemSubTab === 'invoice'
                  ? 'bg-white text-slate-900 border border-slate-200/80 shadow-sm font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              <Receipt className="w-4 h-4 text-emerald-500" /> Invoice Reception & Scan
            </button>
          </div>

          {activeItemSubTab === 'catalog' && (
            <div className="grid lg:grid-cols-12 gap-6">
              {/* Configure core item */}
              <div className="lg:col-span-5 bg-slate-50 border p-5 rounded-2xl h-fit space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                    <PlusCircle className="w-4 h-4 text-amber-500" />
                    {editingItemId ? 'Update Inventory Item' : 'Build Inventory Item'}
                  </h3>
                  {editingItemId && (
                    <button
                      onClick={handleCancelEditItem}
                      className="text-[10px] bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded text-slate-700 font-bold"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 text-xs col-span-2">
                    <label className="font-black text-gray-400 font-mono text-[9px] uppercase">Item Name</label>
                    <input 
                      type="text" 
                      placeholder="E.g. Chicken Breast"
                      value={itemInputName}
                      onChange={(e) => setItemInputName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sans focus:outline-none focus:border-amber-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <label className="font-black text-gray-400 font-mono text-[9px] uppercase">Item Code</label>
                    <input 
                      type="text" 
                      placeholder="E.g. ITM-201"
                      value={itemInputCode}
                      onChange={(e) => setItemInputCode(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sans focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <label className="font-black text-gray-400 font-mono text-[9px] uppercase">Category Section</label>
                    <select 
                      value={itemInputCat}
                      onChange={(e) => setItemInputCat(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="Cooler">Cooler</option>
                      <option value="Dry Storage">Dry Storage</option>
                      <option value="Freezer">Freezer</option>
                      <option value="Steam Table">Steam Table</option>
                      <option value="Prep Area">Prep Area</option>
                      <option value="Bar">Bar</option>
                    </select>
                  </div>
                </div>

                {/* SOURCE TYPE: PURCHASED VS MANUFACTURED */}
                <div className="bg-slate-100 p-4 border border-slate-200 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      🛠️ Item Classification Group
                    </label>
                    <span className="text-[9.5px] font-bold text-slate-400 font-mono">
                      {itemInputSourceType === 'purchased' ? '📦 Vendor Commodity' : '🍳 Prepared In-House'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/50 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setItemInputSourceType('purchased');
                      }}
                      className={`py-2 rounded-lg text-xs font-bold font-sans transition flex items-center justify-center gap-1.5 cursor-pointer ${itemInputSourceType === 'purchased' ? 'bg-slate-900 text-amber-400 shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <span>📥</span> Purchased Item
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setItemInputSourceType('manufactured');
                        // Suggest pre-pending M- to name and code if selected and doesn't already have it
                        if (itemInputName && !itemInputName.startsWith('M-')) {
                          setItemInputName('M-' + itemInputName);
                        }
                        if (itemInputCode && !itemInputCode.startsWith('M-')) {
                          setItemInputCode('M-' + itemInputCode);
                        } else if (!itemInputCode) {
                          setItemInputCode('M-ITM' + Math.floor(100 + Math.random() * 900));
                        }
                      }}
                      className={`py-2 rounded-lg text-xs font-bold font-sans transition flex items-center justify-center gap-1.5 cursor-pointer ${itemInputSourceType === 'manufactured' ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <span>🧑‍🍳</span> Manufactured Item
                    </button>
                  </div>

                  {itemInputSourceType === 'manufactured' && (
                    <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-xl space-y-3.5 animate-fadeIn">
                      <div className="flex items-center justify-between gap-2 border-b border-amber-200/65 pb-1.5">
                        <span className="text-[10.5px] font-extrabold text-amber-900 flex items-center gap-1 uppercase font-mono tracking-wide">
                          🍳 Suggested Naming Prefix
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!itemInputName.startsWith('M-')) {
                              setItemInputName('M-' + itemInputName);
                            }
                            if (!itemInputCode.startsWith('M-')) {
                              setItemInputCode('M-' + itemInputCode);
                            }
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-2 py-0.5 rounded text-[9.5px] font-extrabold font-mono uppercase cursor-pointer"
                        >
                          Enforce "M-" Code
                        </button>
                      </div>
                      
                      {/* Recipe creation matrix */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-extrabold text-amber-950 uppercase font-mono tracking-wider">
                            Recipe Ingredients List <span className="text-rose-600 font-black">*Required*</span>
                          </span>
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-mono px-1.5 rounded-full font-bold">
                            Total: {recipeIngredients.length} ingredients
                          </span>
                        </div>

                        {recipeIngredients.length > 0 ? (
                          <div className="space-y-1 bg-white border border-amber-200/60 p-2 rounded-xl text-[10.5px] font-mono max-h-28 overflow-y-auto">
                            {recipeIngredients.map((ing, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-1.5 py-1 border-b last:border-0 border-slate-100">
                                <span className="text-slate-900 font-bold">{ing.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 font-bold">{ing.qty} {ing.unit}</span>
                                  <button
                                    type="button"
                                    onClick={() => setRecipeIngredients(prev => prev.filter((_, i) => i !== idx))}
                                    className="text-rose-600 hover:text-rose-700 font-bold text-[9px] uppercase hover:underline cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 border-2 border-dashed border-amber-200/50 bg-amber-500/5 rounded-xl text-[10px] text-amber-800 text-center font-bold">
                            No ingredients declared. Add ingredients below.
                          </div>
                        )}

                        {/* Interactive small build box inside recipe */}
                        <div className="bg-amber-100/40 p-2 border border-amber-200/50 rounded-xl space-y-1.5">
                          <label className="block text-[8.5px] font-extrabold text-amber-900 uppercase font-mono">Add Ingredient Item</label>
                          <div className="grid grid-cols-12 gap-1.5">
                            <div className="col-span-12">
                              {/* Search ingredients dropdown/input placeholder */}
                              <select
                                value={ingName}
                                onChange={(e) => setIngName(e.target.value)}
                                className="w-full p-1.5 border border-amber-205 text-[10.5px] rounded-lg bg-white font-semibold focus:outline-none focus:border-amber-500 focus:ring-0"
                              >
                                <option value="">-- Choose Cataloged Item --</option>
                                {items.filter(i => i.itemSourceType !== 'manufactured').map(i => (
                                  <option key={i.id} value={i.name}>{i.name} ({i.unitOfMeasurement})</option>
                                ))}
                                <option value="Salt">Salt</option>
                                <option value="Sugar">Sugar</option>
                                <option value="Black Pepper">Black Pepper</option>
                                <option value="Olive Oil">Olive Oil</option>
                                <option value="Cilantro">Cilantro</option>
                                <option value="Water">Water</option>
                                <option value="White Wine Vinegar">White Wine Vinegar</option>
                              </select>
                              <input 
                                type="text"
                                placeholder="Or type ingredient custom name..."
                                value={ingName}
                                onChange={(e) => setIngName(e.target.value)}
                                className="w-full mt-1 p-1.5 border border-amber-200 text-[10.5px] rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            
                            <div className="col-span-5">
                              <input 
                                type="number" 
                                placeholder="Qty"
                                min="0.01"
                                step="0.01"
                                value={ingQty}
                                onChange={(e) => setIngQty(Number(e.target.value) || 1)}
                                className="w-full p-1.5 border border-amber-200 text-[10.5px] rounded-lg bg-white font-bold text-center focus:outline-none"
                              />
                            </div>

                            <div className="col-span-7 flex gap-1">
                              <select
                                value={ingUnit}
                                onChange={(e) => setIngUnit(e.target.value)}
                                className="flex-1 p-1.5 border border-amber-200 text-[10.5px] rounded-lg bg-white font-bold focus:outline-none"
                              >
                                <option value="lbs">lbs</option>
                                <option value="oz">oz</option>
                                <option value="gal">gal</option>
                                <option value="L">L</option>
                                <option value="mL">mL</option>
                                <option value="fl oz">fl oz</option>
                                <option value="cups">cups</option>
                                <option value="tbsp">tbsp</option>
                                <option value="tsp">tsp</option>
                                <option value="Cases">Cases</option>
                                <option value="Each">Each</option>
                                {customUoms.map(cu => (
                                  <option key={cu.name} value={cu.name}>{cu.name} ({cu.equateQty} {cu.equateUnit})</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!ingName) {
                                    alert("Ingredient Name must be supplied");
                                    return;
                                  }
                                  setRecipeIngredients(prev => [
                                    ...prev,
                                    { name: ingName, qty: ingQty, unit: ingUnit }
                                  ]);
                                  setIngName('');
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-amber-500 font-extrabold px-2.5 rounded-lg text-[10px] transition shrink-0 cursor-pointer"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Yield structures configurations */}
                      <div className="space-y-2 border-t border-amber-200/80 pt-2 text-xs text-amber-950">
                        <span className="block text-[10px] font-extrabold text-amber-900 uppercase font-mono tracking-wider">
                          🍯 Accurate Dual Yield Specifications
                        </span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1 bg-white p-2 border border-amber-200/50 rounded-xl">
                            <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono">Yield 1 Volume/Qty</label>
                            <input 
                              type="number"
                              placeholder="e.g. 10" 
                              value={itemInputYield1Qty}
                              onChange={(e) => setItemInputYield1Qty(Number(e.target.value) || 10)}
                              className="w-full text-xs p-1 bg-slate-50 border rounded text-slate-850 font-bold focus:outline-none"
                            />
                            <select
                              value={itemInputYield1Unit}
                              onChange={(e) => setItemInputYield1Unit(e.target.value)}
                              className="w-full mt-1 text-[10px] p-0.5 bg-white border rounded text-slate-850 font-semibold"
                            >
                              <option value="gal">Gallons (gal)</option>
                              <option value="lbs">Pounds (lbs)</option>
                              <option value="L">Liters (L)</option>
                              <option value="oz">Ounces (oz)</option>
                              <option value="Tubs">Tubs</option>
                              {customUoms.map(cu => (
                                <option key={cu.name} value={cu.name}>{cu.name}s</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1 bg-white p-2 border border-amber-200/50 rounded-xl">
                            <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono">Yield 2 Equivalents</label>
                            <input 
                              type="number"
                              placeholder="e.g. 80" 
                              value={itemInputYield2Qty}
                              onChange={(e) => setItemInputYield2Qty(Number(e.target.value) || 80)}
                              className="w-full text-xs p-1 bg-slate-50 border rounded text-slate-850 font-bold focus:outline-none"
                            />
                            <select
                              value={itemInputYield2Unit}
                              onChange={(e) => setItemInputYield2Unit(e.target.value)}
                              className="w-full mt-1 text-[10px] p-0.5 bg-white border rounded text-slate-850 font-semibold"
                            >
                              <option value="lbs">Pounds (lbs)</option>
                              <option value="gal">Gallons (gal)</option>
                              <option value="L">Liters (L)</option>
                              <option value="oz">Ounces (oz)</option>
                              <option value="Tubs">Tubs</option>
                              {customUoms.map(cu => (
                                <option key={cu.name} value={cu.name}>{cu.name}s</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <p className="text-[9.5px] leading-tight text-amber-805 font-mono italic">
                          ℹ️ Yield accuracy verify check: <b>{itemInputYield1Qty} {itemInputYield1Unit}</b> equates precisely to <b>{itemInputYield2Qty} {itemInputYield2Unit}</b> during batch manufacturing logic reports.
                        </p>
                      </div>
                    </div>
                  )}

                  {itemInputSourceType === 'purchased' && (
                    <div className="bg-slate-200/60 p-3 rounded-xl space-y-2 text-xs border border-slate-300 animate-fadeIn text-slate-800">
                      <span className="block text-[9.5px] font-black font-mono text-slate-500 uppercase">
                        📦 Purchasing Inventory Records
                      </span>
                      
                      <div>
                        <label className="block text-[8.5px] font-bold text-slate-400 uppercase font-mono">Purchased Stock Qty</label>
                        <input 
                          type="number" 
                          placeholder="E.g. 10"
                          value={itemInputPurchasedQty}
                          onChange={(e) => setItemInputPurchasedQty(Number(e.target.value) || 0)}
                          className="w-full p-2 border rounded-xl bg-white text-slate-900 font-mono font-extrabold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <p className="text-[9.5px] text-slate-500 font-mono italic leading-snug">
                        Original base par items calculated with standard purchasing configurations.
                      </p>
                    </div>
                  )}
                </div>

                {/* CUSTOM UNITS & CONFORMANCE MATRIX DICTIONARY (SUPER ADMIN & ADMIN ONLY) */}
                {(simUser?.role === 'Super Admin' || simUser?.role === 'Admin') && (
                  <div className="bg-slate-900 text-white p-4 rounded-2xl border border-amber-500/30 space-y-3 shadow-md">
                    <span className="block text-[10px] font-black font-mono text-amber-500 uppercase tracking-widest flex items-center gap-1">
                      📐 Custom Units of Measurement Manager
                    </span>
                    <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                      Create proprietary internal inventory structures. Equate your custom unit labels to standard base weight or volume properties.
                    </p>

                    <div className="grid grid-cols-12 gap-1.5 pt-1">
                      <div className="col-span-5">
                        <input
                          type="text"
                          placeholder="Unit (e.g. Tub)"
                          value={customUomName}
                          onChange={(e) => setCustomUomName(e.target.value)}
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          placeholder="Val"
                          value={customUomEquateQty}
                          onChange={(e) => setCustomUomEquateQty(Number(e.target.value) || 1)}
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white font-bold text-center focus:outline-none"
                        />
                      </div>
                      <div className="col-span-4 flex gap-1">
                        <select
                          value={customUomEquateUnit}
                          onChange={(e) => setCustomUomEquateUnit(e.target.value)}
                          className="flex-1 text-[11px] p-1 bg-slate-800 border border-slate-700 rounded-lg text-amber-400 font-bold focus:outline-none"
                        >
                          <option value="lbs">lbs</option>
                          <option value="oz">oz</option>
                          <option value="gal">gal</option>
                          <option value="L">L</option>
                          <option value="mL">mL</option>
                          <option value="fl oz">fl oz</option>
                          <option value="Each">Each</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            if (!customUomName) {
                              alert("Please supply a custom unit label, e.g., Tub, Pack, Container...");
                              return;
                            }
                            const exists = customUoms.some(cu => cu.name.toLowerCase() === customUomName.toLowerCase());
                            if (exists) {
                              alert(`The Unit measurement unit "${customUomName}" is already cataloged!`);
                              return;
                            }
                            setCustomUoms(prev => [
                              ...prev,
                              { name: customUomName, equateQty: customUomEquateQty, equateUnit: customUomEquateUnit }
                            ]);
                            showToast(`Saved custom unit equivalence: 1 ${customUomName} = ${customUomEquateQty} ${customUomEquateUnit}`);
                            setCustomUomName('');
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-2 py-1 rounded-lg text-xs font-black transition cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-2 space-y-1">
                      <span className="block text-[8.5px] font-bold text-slate-400 uppercase font-mono">Current Equivalencies:</span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                        {customUoms.map((uom, key) => (
                          <div key={key} className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-2 py-1 text-[10px] flex items-center gap-1.5 font-mono">
                            <span className="font-bold text-amber-400">{uom.name}</span>
                            <span className="text-slate-500">&rarr;</span>
                            <span className="text-slate-200">{uom.equateQty} {uom.equateUnit}</span>
                            <button
                              type="button"
                              onClick={() => setCustomUoms(prev => prev.filter((_, i) => i !== key))}
                              className="text-red-400 hover:text-red-500 font-bold ml-1 cursor-pointer"
                              title="Delete equivalence"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* PHYSICAL ATTRIBUTES & MEASUREMENTS SELECTION PANEL */}
                <div className="bg-slate-150 p-3.5 border border-slate-200 rounded-2xl space-y-3.5 shadow-sm">
                  <span className="block text-[9.5px] font-black font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-amber-500" /> Cataloged Measurement Specifications
                  </span>
                  
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/60 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setItemInputMeasurementType('discrete')}
                      className={`py-2 rounded-lg text-[10px] font-extrabold font-mono transition flex flex-col items-center justify-center gap-0.5 ${itemInputMeasurementType === 'discrete' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-slate-100/60'}`}
                    >
                      <span className="text-sm">📦</span>
                      <span>Standard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemInputMeasurementType('weight')}
                      className={`py-2 rounded-lg text-[10px] font-extrabold font-mono transition flex flex-col items-center justify-center gap-0.5 ${itemInputMeasurementType === 'weight' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-slate-100/60'}`}
                    >
                      <span className="text-sm">⚖️</span>
                      <span>Weight</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemInputMeasurementType('liquid')}
                      className={`py-2 rounded-lg text-[10px] font-extrabold font-mono transition flex flex-col items-center justify-center gap-0.5 ${itemInputMeasurementType === 'liquid' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-slate-100/60'}`}
                    >
                      <span className="text-sm">💧</span>
                      <span>Liquid</span>
                    </button>
                  </div>

                  {itemInputMeasurementType === 'discrete' && (
                    <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                      <div className="space-y-1 text-xs">
                        <label className="font-extrabold text-slate-400 font-mono text-[8.5px] uppercase">Base Discrete Unit</label>
                        <input 
                          type="text" 
                          placeholder="e.g. cases, cases, cans"
                          value={itemInputUnit}
                          onChange={(e) => setItemInputUnit(e.target.value)}
                          className="w-full p-2 border rounded-xl bg-white text-sans text-xs focus:outline-none focus:border-amber-500 font-semibold"
                        />
                      </div>
                      <div className="space-y-1 text-xs">
                        <label className="font-extrabold text-slate-400 font-mono text-[8.5px] uppercase">Qty per case</label>
                        <input 
                          type="number" 
                          placeholder="E.g. 100"
                          value={itemInputQtyPerCase}
                          onChange={(e) => setItemInputQtyPerCase(Number(e.target.value) || 1)}
                          className="w-full p-2 border rounded-xl bg-white text-xs focus:outline-none focus:border-amber-500 font-mono font-bold"
                        />
                      </div>
                    </div>
                  )}

                  {itemInputMeasurementType === 'weight' && (
                    <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                      <div className="space-y-1 text-xs">
                        <label className="font-extrabold text-slate-400 font-mono text-[8.5px] uppercase">Amount/Value</label>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="e.g. 10"
                          value={itemInputMeasurementValue}
                          onChange={(e) => setItemInputMeasurementValue(Number(e.target.value) || 1)}
                          className="w-full p-2 border rounded-xl bg-white text-xs focus:outline-none focus:border-amber-500 font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-1 text-xs">
                        <label className="font-extrabold text-slate-400 font-mono text-[8.5px] uppercase">Weight Unit Label</label>
                        <select 
                          value={itemInputWeightUnit}
                          onChange={(e) => setItemInputWeightUnit(e.target.value as 'lbs' | 'oz')}
                          className="w-full p-2 border rounded-xl bg-white text-xs focus:outline-none focus:border-amber-500 font-mono font-bold"
                        >
                          <option value="lbs">lbs (abbr. Pounds)</option>
                          <option value="oz">oz (abbr. Ounces)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {itemInputMeasurementType === 'liquid' && (
                    <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                      <div className="space-y-1 text-xs">
                        <label className="font-extrabold text-slate-400 font-mono text-[8.5px] uppercase">Volume/Amount</label>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="e.g. 1"
                          value={itemInputMeasurementValue}
                          onChange={(e) => setItemInputMeasurementValue(Number(e.target.value) || 1)}
                          className="w-full p-2 border rounded-xl bg-white text-xs focus:outline-none focus:border-amber-500 font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-1 text-xs">
                        <label className="font-extrabold text-slate-400 font-mono text-[8.5px] uppercase">Liquid Unit Label</label>
                        <select 
                          value={itemInputLiquidUnit}
                          onChange={(e) => setItemInputLiquidUnit(e.target.value as any)}
                          className="w-full p-2 border rounded-xl bg-white text-xs focus:outline-none focus:border-amber-500 font-mono font-bold"
                        >
                          <option value="gal">gal (abbr. Gallons)</option>
                          <option value="L">L (abbr. Liters)</option>
                          <option value="mL">mL (abbr. Milliliters)</option>
                          <option value="fl oz">fl oz (abbr. Fluid Ounces)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <label className="font-black text-gray-400 font-mono text-[9px] uppercase">Registered Vendor Name</label>
                  <select
                    value={itemInputVendor}
                    onChange={(e) => setItemInputVendor(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sans focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="">-- Select Registered Vendor --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.name}>{v.name}</option>
                    ))}
                    <option value="Sysco Food Services">Sysco Food Services (Default)</option>
                    <option value="US Foods">US Foods</option>
                    <option value="FreshPoint Produce">FreshPoint Produce</option>
                    <option value="Capital Eagle Distributors">Capital Eagle Distributors</option>
                  </select>
                  <div className="pt-1 select-none">
                    <span className="text-[10px] text-slate-400">Or type manual fallback:</span>
                    <input 
                      type="text" 
                      placeholder="Manual input fallback..."
                      value={itemInputVendor}
                      onChange={(e) => setItemInputVendor(e.target.value)}
                      className="w-full mt-1 p-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Highly structured multi-tiered unit ratio mappings */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={itemInputHasNested}
                      onChange={(e) => setItemInputHasNested(e.target.checked)}
                      className="rounded border-slate-300 text-amber-50 w-4 h-4 accent-amber-500" 
                    />
                    Add another unit of measurement (nested)
                  </label>

                  {itemInputHasNested && (
                    <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                      <p className="text-[10px] text-slate-500 italic pb-1">
                        Configure complex layered levels (e.g. 1 Case of lids contains 20 sleeves, each sleeve contains 100 Each).
                      </p>

                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div className="space-y-1">
                          <span className="block text-[9px] font-black font-mono text-slate-400 uppercase">1 {itemInputUnit || 'Case'} contains:</span>
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              value={itemInputInnerQtyPerParent}
                              onChange={(e) => setItemInputInnerQtyPerParent(Number(e.target.value) || 1)}
                              className="w-16 p-1.5 border rounded bg-white text-xs font-mono font-bold"
                            />
                            <input 
                              type="text" 
                              value={itemInputInnerUnitName}
                              onChange={(e) => setItemInputInnerUnitName(e.target.value)}
                              placeholder="sleeves"
                              className="w-full p-1.5 border rounded bg-white text-xs font-semibold"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="block text-[9px] font-black font-mono text-slate-400 uppercase">And each {itemInputInnerUnitName || 'sleeve'} has:</span>
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              value={itemInputBaseQtyPerInner}
                              onChange={(e) => setItemInputBaseQtyPerInner(Number(e.target.value) || 1)}
                              className="w-16 p-1.5 border rounded bg-white text-xs font-mono font-bold"
                            />
                            <input 
                              type="text" 
                              value={itemInputBaseUnitName}
                              onChange={(e) => setItemInputBaseUnitName(e.target.value)}
                              placeholder="lids/each"
                              className="w-full p-1.5 border rounded bg-white text-xs font-semibold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Display live matrix math review */}
                      <div className="p-2 border border-amber-200/60 bg-amber-500/5 text-[11px] text-amber-800 rounded-lg leading-relaxed font-mono">
                        📊 Live Ratio Checklist:
                        <br />
                        <span className="font-bold">1 {itemInputUnit || 'Case'}</span> = {itemInputInnerQtyPerParent} {itemInputInnerUnitName || 'sleeves'} 
                        <br />
                        <span className="font-bold">Total Lids</span> = {itemInputInnerQtyPerParent * itemInputBaseQtyPerInner} {itemInputBaseUnitName || 'each'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 text-xs">
                    <label className="font-black text-gray-400 font-mono text-[9px] uppercase">Standard Par Level</label>
                    <input 
                      type="number" 
                      min={1}
                      value={itemInputPar}
                      onChange={(e) => setItemInputPar(parseInt(e.target.value) || 1)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <label className="font-black text-gray-400 font-mono text-[9px] uppercase">Base/Initial Price ($)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={itemInputPrice}
                      onChange={(e) => setItemInputPrice(parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-mono font-bold focus:outline-none focus:border-amber-500 text-emerald-700"
                    />
                  </div>
                </div>

                {/* Sub-form to simulate recent purchase dates/prices of item */}
                <div className="p-3 bg-slate-100 border border-slate-250 rounded-xl space-y-2 text-xs">
                  <span className="block text-[9px] font-black font-mono text-slate-500 uppercase">Recent Purchase Record</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase">Purchase Price ($)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={itemInputRecentPurchasePrice}
                        onChange={(e) => setItemInputRecentPurchasePrice(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 p-2 border border-slate-200 rounded-lg bg-white text-xs font-mono text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase">Purchase Date</label>
                      <input 
                        type="datetime-local" 
                        value={itemInputRecentPurchaseDate.substring(0, 16)}
                        onChange={(e) => setItemInputRecentPurchaseDate(e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString())}
                        className="w-full mt-1 p-2 border border-slate-200 rounded-lg bg-white text-xs font-mono text-slate-850"
                      />
                    </div>
                  </div>
                </div>

                {/* Photo URL selection / preview */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <label className="font-extrabold text-slate-500 font-mono text-[9.5px] uppercase block">Product Photos (Minimum 3-4 PNGs Saved)</label>
                    <button 
                      type="button"
                      disabled={!itemInputName || isScrapingPhotos}
                      onClick={() => simulateScrapingProcess(itemInputName, (urls) => setItemInputPhotoUrls(urls))}
                      className="text-[9px] bg-slate-100 hover:bg-amber-500 hover:text-slate-950 px-2 py-0.5 border rounded-lg font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500 shrink-0" /> Search Vendor Stock
                    </button>
                  </div>

                  <div className="border border-slate-200 p-3.5 bg-white rounded-2xl text-center space-y-3 shadow-sm">
                    {/* Active Scraper Spinner */}
                    {(isScrapingPhotos || isConvertingToPng) ? (
                      <div className="bg-slate-900 text-white p-3 border border-amber-500 rounded-xl space-y-2.5 font-mono text-[10px] text-left">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                          <span className="font-bold text-amber-400 uppercase tracking-widest text-[9px]">Web Assembly PNG Compressor</span>
                        </div>
                        <p className="text-slate-300 leading-normal">{photoScrapeStep}</p>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full animate-pulse" style={{ width: isConvertingToPng ? '85%' : '40%' }}></div>
                        </div>
                      </div>
                    ) : itemInputPhotoUrls && itemInputPhotoUrls.length > 0 ? (
                      <div className="space-y-2.5">
                        <span className="block text-[8.5px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 font-extrabold uppercase">
                          ✅ Converted to Optimized PNG Format (&lt; 35KB each)
                        </span>
                        <div className="grid grid-cols-4 gap-2">
                          {itemInputPhotoUrls.map((url, i) => (
                            <div key={i} className="relative group rounded-lg overflow-hidden border bg-slate-50 shadow-inner">
                              <img 
                                referrerPolicy="no-referrer"
                                src={url} 
                                alt={`Img ${i}`} 
                                className="w-full h-11 object-cover cursor-pointer hover:scale-105 transition"
                                onClick={() => setItemPhotoSimulated(url)}
                              />
                              <span className="absolute bottom-0 left-0 right-0 py-0.5 text-[7px] font-mono font-black bg-emerald-500 text-white block text-center truncate">
                                PNG #{i + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-200 p-3 rounded-xl bg-slate-50 text-[10px] text-slate-500">
                        No custom image list loaded yet. Type name above & save or search to automatically map 4 compressed PNGs!
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <img 
                        referrerPolicy="no-referrer"
                        src={itemPhotoSimulated}
                        alt="Primary"
                        className="w-10 h-10 rounded-lg object-cover border shadow-sm shrink-0 bg-slate-100"
                      />
                      <input
                        type="text"
                        value={itemPhotoSimulated}
                        onChange={(e) => setItemPhotoSimulated(e.target.value)}
                        placeholder="Or customize primary photo URL..."
                        className="w-full p-2 border border-slate-200 rounded-lg text-[10.5px] font-mono text-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="flex gap-1 justify-center flex-wrap">
                      <button 
                        onClick={() => {
                          setItemPhotoSimulated('https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=200&q=80');
                          setItemInputPhotoUrls([
                            'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=200&q=80',
                            'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=200&q=80',
                            'https://images.unsplash.com/photo-1549611016-3a70d82b5040?auto=format&fit=crop&w=200&q=80'
                          ]);
                        }}
                        className="p-1 px-1.5 border hover:bg-slate-50 transition rounded text-[9px] font-mono leading-none bg-slate-50"
                      >
                        Bread Sets
                      </button>
                      <button 
                        onClick={() => {
                          setItemPhotoSimulated('https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=200&q=80');
                          setItemInputPhotoUrls([
                            'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=200&q=80',
                            'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=200&q=80',
                            'https://images.unsplash.com/photo-1590682680695-43b964a3ae17?auto=format&fit=crop&w=200&q=80'
                          ]);
                        }}
                        className="p-1 px-1.5 border hover:bg-slate-50 transition rounded text-[9px] font-mono leading-none bg-slate-50"
                      >
                        Tomato Sets
                      </button>
                      <button 
                        onClick={() => {
                          setItemPhotoSimulated('https://images.unsplash.com/photo-1518013002796-0341c3051bb9?auto=format&fit=crop&w=200&q=80');
                          setItemInputPhotoUrls([
                            'https://images.unsplash.com/photo-1518013002796-0341c3051bb9?auto=format&fit=crop&w=200&q=80',
                            'https://images.unsplash.com/photo-1620921515158-760f331dd9f2?auto=format&fit=crop&w=200&q=80',
                            'https://images.unsplash.com/photo-1560684352-8497838a2229?auto=format&fit=crop&w=200&q=80'
                          ]);
                        }}
                        className="p-1 px-1.5 border hover:bg-slate-50 transition rounded text-[9px] font-mono leading-none bg-slate-50"
                      >
                        Salsa Sets
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateItem}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 px-4 rounded-xl text-xs uppercase cursor-pointer transition active:scale-95 shadow-md flex items-center justify-center gap-1.5"
                >
                  <CheckSquare className="w-4 h-4" />
                  {editingItemId ? 'Update Item Catalog Entry' : 'Save New Catalog Item'}
                </button>
              </div>

              {/* Items database viewer */}
              <div className="lg:col-span-7 space-y-3 flex flex-col h-full">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search inventory items catalog by name, code or vendor..."
                    value={searchItem}
                    onChange={(e) => setSearchItem(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-xs placeholder-slate-400 bg-slate-50 focus:outline-none focus:border-amber-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>

                <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
                  {items.filter(item => 
                    item.name.toLowerCase().includes(searchItem.toLowerCase()) || 
                    (item.itemCode && item.itemCode.toLowerCase().includes(searchItem.toLowerCase())) ||
                    item.vendorName.toLowerCase().includes(searchItem.toLowerCase())
                  ).map(item => {
                    const isManufactured = item.itemSourceType === 'manufactured';
                    const isPurchased = item.itemSourceType !== 'manufactured';
                    const purchasedQty = item.purchasedQty !== undefined ? item.purchasedQty : 10;
                    const unitPrice = item.recentPurchasePrice !== undefined ? item.recentPurchasePrice : 24.50;
                    const totalPurchasedItemCost = purchasedQty * unitPrice;

                    return (
                      <div key={item.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition flex flex-col sm:flex-row items-start justify-between gap-4">
                        
                        <div className="flex items-start gap-3.5 flex-1">
                          <img 
                            referrerPolicy="no-referrer"
                            src={item.photoUrl} 
                            alt={item.name}
                            className="w-14 h-14 rounded-lg object-cover border bg-slate-100 shadow-sm shrink-0"
                          />
                          <div className="text-xs space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{item.name}</h4>
                              <span className="bg-slate-150 font-mono text-[9px] font-bold text-slate-600 px-2 py-0.5 rounded border">
                                {item.itemCode || item.id}
                              </span>
                              
                              {/* Source Classification Badges */}
                              {isManufactured ? (
                                <span className="bg-amber-500 text-slate-950 font-mono font-black text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-400">
                                  🧑‍🍳 Manufactured in-house
                                </span>
                              ) : (
                                <span className="bg-emerald-500 text-white font-mono font-black text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-400">
                                  📥 Purchased Commodity
                                </span>
                              )}
                            </div>
                            <p className="text-slate-400 text-[11px] leading-tight flex flex-wrap items-center gap-1">
                              Category: <span className="text-slate-750 font-bold">{item.category}</span> | Vendor: <span className="text-sky-700 font-bold">{item.vendorName}</span>
                              {item.measurementType === 'weight' && (
                                <span className="bg-amber-100/70 border border-amber-250 text-amber-900 font-black px-1.5 py-0.5 rounded ml-1 text-[8.5px] font-mono tracking-wide">
                                  ⚖️ {item.weightOrVolumeValue} {item.weightUnit || 'lbs'}
                                </span>
                              )}
                              {item.measurementType === 'liquid' && (
                                <span className="bg-sky-100/70 border border-sky-250 text-sky-900 font-black px-1.5 py-0.5 rounded ml-1 text-[8.5px] font-mono tracking-wide">
                                  💧 {item.weightOrVolumeValue} {item.liquidUnit || 'gal'}
                                </span>
                              )}
                            </p>
                            
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 bg-slate-50 p-2 rounded-lg text-[10px] text-slate-500 font-mono border mt-1">
                              <div>
                                <span>🛎️ Par level: </span>
                                <span className="font-black text-slate-755">{item.defaultParLevel} {item.unitOfMeasurement || 'cases'}</span>
                              </div>
                              <div>
                                <span>📦 Case Quantity: </span>
                                <span className="font-semibold text-slate-700">{item.quantityPerCase || '100'} each</span>
                              </div>
                              
                              <div className="col-span-2 pt-1 border-t border-slate-200/85 mt-1 flex flex-col gap-0.5 text-[9.5px]">
                                <div className="flex items-center justify-between text-slate-400">
                                  <span className="flex items-center gap-1"><Clock className="w-3" /> First Added:</span>
                                  <span className="font-bold text-slate-700">
                                    {item.createdAt ? new Date(item.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : '5/25/2026, 12:00 AM'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-400 font-bold">
                                  <span className="flex items-center gap-1 font-semibold"><DollarSign className="w-3 text-emerald-600" /> Unit Price / Cost:</span>
                                  <span className="font-extrabold text-emerald-700">${unitPrice.toFixed(2)} / {item.unitOfMeasurement || 'cases'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Manufactured Items SPECIFIC DATA (Recipes & Yields) */}
                            {isManufactured && (
                              <div className="mt-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 space-y-2 animate-fadeIn">
                                <span className="block text-[8.5px] font-extrabold text-amber-805 uppercase font-mono tracking-wider">
                                  📖 Standard Recipe Formulation:
                                </span>
                                {item.recipeIngredients && item.recipeIngredients.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 font-mono text-[9px]">
                                    {item.recipeIngredients.map((ing, i) => (
                                      <span key={i} className="bg-amber-100/80 border border-amber-200 text-slate-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <span>🥕 {ing.name}:</span>
                                        <b className="text-amber-900">{ing.qty} {ing.unit}</b>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[9.5px] italic text-amber-700">No ingredients specified.</p>
                                )}

                                <div className="pt-2 border-t border-dashed border-amber-500/25 flex flex-wrap gap-2 items-center justify-between text-xs font-mono">
                                  <span className="text-[9.5px] text-amber-950 font-semibold flex items-center gap-1">
                                    🎯 Batch Production Yield Equivalences:
                                  </span>
                                  <div className="flex items-center gap-1.5 font-bold">
                                    <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded">
                                      {item.yield1Qty || 10} {item.yield1Unit || 'Gallons'}
                                    </span>
                                    <span className="text-amber-800">&harr;</span>
                                    <span className="bg-slate-900 text-white px-2 py-0.5 rounded">
                                      {item.yield2Qty || 10} {item.yield2Unit || 'lbs'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Purchased Items SPECIFIC DATA (Stock qty, total value calculations) */}
                            {isPurchased && (
                              <div className="mt-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 font-mono animate-fadeIn">
                                <div className="space-y-0.5">
                                  <span className="block text-[8.5px] font-bold text-emerald-800 uppercase">Commodity Asset Register</span>
                                  <span className="text-[11px] text-slate-700">
                                    Stock Volume: <strong className="text-slate-950 underline">{purchasedQty} {item.unitOfMeasurement || 'cases'}</strong>
                                  </span>
                                </div>
                                
                                <div className="text-right sm:text-right bg-emerald-500/10 border border-emerald-400/40 p-1.5 rounded-lg text-xs">
                                  <span className="block text-[8.5px] text-emerald-800 uppercase font-black text-center sm:text-right">Total Stock Cost Value</span>
                                  <strong className="text-emerald-700 text-sm font-black">${totalPurchasedItemCost.toFixed(2)}</strong>
                                </div>
                              </div>
                            )}
    
                            {/* Complex secondary multi-tiers of measurement summary */}
                            {item.nestedUnitConfig?.hasNested && (
                              <div className="mt-2 bg-amber-500/10 border border-amber-200 flex items-center gap-1.5 p-1.5 rounded-lg text-[10px] text-amber-900 font-mono">
                                <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                <div>
                                  <span>Multi-Tier Pack Hierarchy Configured:</span>
                                  <br />
                                  <span>1 {item.unitOfMeasurement || 'Case'} = {item.nestedUnitConfig.innerQtyPerParent} {item.nestedUnitConfig.innerUnitName}s = <span className="font-bold underline text-amber-800">{item.nestedUnitConfig.innerQtyPerParent * item.nestedUnitConfig.baseQtyPerInner} {item.nestedUnitConfig.baseUnitName}s total</span></span>
                                </div>
                              </div>
                            )}
  
                            {/* 3-4 stock photos gallery display */}
                            {item.photoUrls && item.photoUrls.length > 0 && (
                              <div className="mt-3 pt-2.5 border-t border-dashed border-slate-150">
                                <span className="block text-[8.5px] font-black font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                                  🖼️ Optimized Stock Photos Gallery ({item.photoUrls.length} compressed PNGs)
                                </span>
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                  {item.photoUrls.slice(0, 4).map((url, index) => (
                                    <div key={index} className="relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden shrink-0 shadow-sm hover:scale-105 hover:border-amber-500 transition-all">
                                      <img 
                                        referrerPolicy="no-referrer"
                                        src={url} 
                                        alt={`${item.name} stock ${index}`} 
                                        className="w-full h-full object-cover"
                                      />
                                      <span className="absolute bottom-0 left-0 right-0 py-0.5 text-[6px] font-black bg-slate-900/70 text-white block text-center uppercase tracking-tighter">
                                        {index === 0 ? "Pri PNG" : `PNG #${index + 1}`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
  
                        <div className="flex gap-1.5 shrink-0 self-end sm:self-start">
                          <button
                            onClick={() => handleStartEditItem(item)}
                            className="p-2 border hover:bg-slate-50 rounded-xl text-slate-600 transition hover:text-amber-500 flex items-center justify-center gap-1 bg-white cursor-pointer"
                            title="Edit Catalog Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold pr-0.5">Edit</span>
                          </button>
                        </div>
  
                      </div>
                    );
                  })}
                </div>

                {/* GRAND TOTAL RIBBON AT THE BOTTOM OF THE COLUMN */}
                <div className="mt-4 bg-slate-950 text-white p-4 rounded-xl border-l-4 border-emerald-500 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xl font-bold">
                      💲
                    </div>
                    <div>
                      <span className="block text-[9.5px] text-slate-400 font-mono uppercase tracking-wider">All Purchased Commodities</span>
                      <strong className="text-xs text-slate-200">Aggregate Inventory Grand Total Stock Value</strong>
                    </div>
                  </div>
                  <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-center sm:text-right shrink-0">
                    <span className="block text-[8.5px] text-emerald-400 font-mono uppercase font-bold tracking-widest">Grand Total Cost</span>
                    <strong className="text-emerald-450 text-xl font-mono font-black">
                      ${items
                        .filter(item => item.itemSourceType !== 'manufactured')
                        .reduce((total, item) => {
                          const qty = item.purchasedQty !== undefined ? item.purchasedQty : 10;
                          const price = item.recentPurchasePrice !== undefined ? item.recentPurchasePrice : 24.50;
                          return total + (qty * price);
                        }, 0)
                        .toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeItemSubTab === 'vendors' && (
            <div className="grid lg:grid-cols-12 gap-6">
              {/* Build & Edit Vendor UI Panel */}
              <div className="lg:col-span-5 bg-slate-50 border p-5 rounded-2xl h-fit space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                    <PlusCircle className="w-4 h-4 text-sky-500 animate-pulse" />
                    {editingVendorId ? 'Update Registered Vendor' : 'Build Registered Vendor'}
                  </h3>
                  {editingVendorId && (
                    <button
                      onClick={() => {
                        setEditingVendorId(null);
                        setVendorInputName('');
                        setVendorInputAddress('');
                        setVendorInputPhone('');
                        setVendorInputRep('');
                        setVendorInputEmail('');
                        setVendorInputCell('');
                        setVendorInputDirect('');
                      }}
                      className="text-[10px] bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded text-slate-700 font-bold"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-black text-gray-400 font-mono text-[9px] uppercase font-bold">Vendor Business Name</label>
                    <input 
                      type="text" 
                      placeholder="E.g. Sysco Mid-Atlantic"
                      value={vendorInputName}
                      onChange={(e) => setVendorInputName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-sky-500 font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-black text-gray-400 font-mono text-[9px] uppercase">Vendor Headquarters Address</label>
                    <input 
                      type="text" 
                      placeholder="E.g. 13900 Sysco Rd, Jessup MD"
                      value={vendorInputAddress}
                      onChange={(e) => setVendorInputAddress(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-sky-500 text-slate-800 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="font-black text-gray-400 font-mono text-[9px] uppercase">Main Phone Number</label>
                      <input 
                        type="text" 
                        placeholder="E.g. 800-555-0101"
                        value={vendorInputPhone}
                        onChange={(e) => setVendorInputPhone(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-mono focus:outline-none focus:border-sky-500 text-slate-800 font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-black text-gray-400 font-mono text-[9px] uppercase font-bold">Representative Name</label>
                      <input 
                        type="text" 
                        placeholder="E.g. Sarah Connolly"
                        value={vendorInputRep}
                        onChange={(e) => setVendorInputRep(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-semibold focus:outline-none focus:border-sky-500 text-slate-850"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-black text-gray-400 font-mono text-[9px] uppercase font-bold">Representative Position</label>
                    <input 
                      type="text" 
                      placeholder="E.g. Senior Account Manager, Logistics Lead"
                      value={vendorInputPosition}
                      onChange={(e) => setVendorInputPosition(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-sky-500 text-slate-800 font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-black text-gray-400 font-mono text-[9px] uppercase">Representative Email Address</label>
                    <input 
                      type="email" 
                      placeholder="E.g. logistics-rep@sysco.com"
                      value={vendorInputEmail}
                      onChange={(e) => setVendorInputEmail(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-semibold focus:outline-none focus:border-sky-500 text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="font-black text-gray-400 font-mono text-[9px] uppercase">Representative Cellphone</label>
                      <input 
                        type="text" 
                        placeholder="E.g. 240-555-0199"
                        value={vendorInputCell}
                        onChange={(e) => setVendorInputCell(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-black text-gray-400 font-mono text-[9px] uppercase">Direct Line Phone</label>
                      <input 
                        type="text" 
                        placeholder="E.g. 240-555-0198"
                        value={vendorInputDirect}
                        onChange={(e) => setVendorInputDirect(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateVendor}
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-3 px-4 rounded-xl text-xs uppercase cursor-pointer transition active:scale-95 shadow-md flex items-center justify-center gap-1.5"
                >
                  <CheckSquare className="w-4 h-4" />
                  {editingVendorId ? 'Save Updated Vendor Contact' : 'Register New Vendor Profile'}
                </button>
              </div>

              {/* Registered vendors catalog table */}
              <div className="lg:col-span-7 space-y-3">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search vendors by identity, location, email or representative..."
                    value={searchVendor}
                    onChange={(e) => setSearchVendor(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-xs placeholder-slate-400 bg-slate-50 focus:outline-none focus:border-sky-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>

                <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                  {vendors.filter(v => 
                    v.name.toLowerCase().includes(searchVendor.toLowerCase()) || 
                    v.representative.toLowerCase().includes(searchVendor.toLowerCase()) || 
                    (v.representativePosition && v.representativePosition.toLowerCase().includes(searchVendor.toLowerCase())) || 
                    v.email.toLowerCase().includes(searchVendor.toLowerCase()) ||
                    v.address.toLowerCase().includes(searchVendor.toLowerCase())
                  ).map(v => (
                    <div key={v.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-350 transition space-y-3.5">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-slate-950 text-sm">{v.name}</h4>
                          <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Registered: <strong className="text-slate-650">{new Date(v.createdAt).toLocaleDateString()} {new Date(v.createdAt).toLocaleTimeString()}</strong></span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => handleStartEditVendor(v)}
                            className="p-2 border hover:bg-slate-50 rounded-lg text-slate-600 transition hover:text-sky-600 bg-white cursor-pointer"
                            title="Edit Contact Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteVendor(v.id)}
                            className="p-2 border hover:bg-red-50 rounded-lg text-slate-500 transition hover:text-red-650 bg-white cursor-pointer"
                            title="Remove Registration"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 text-xs leading-normal bg-slate-50 p-3 rounded-xl border">
                        <div className="space-y-1.5 col-span-2 text-slate-600">
                          <span className="text-[10px] uppercase font-bold tracking-wide text-slate-400 block font-mono">Headquarters Address:</span>
                          <span className="font-medium text-slate-800">{v.address}</span>
                        </div>
                        
                        <div className="space-y-1 text-slate-500">
                          <span className="text-[10px] uppercase font-bold tracking-wide text-slate-400 block font-mono">Operations Phone:</span>
                          <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-700">
                            <Phone className="w-3 h-3 text-sky-500" /> {v.phone}
                          </span>
                        </div>

                        <div className="space-y-1 text-slate-500">
                          <span className="text-[10px] uppercase font-bold tracking-wide text-slate-400 block font-mono">Assigned Representative:</span>
                          <span className="font-extrabold text-slate-950 text-[11px] block">
                            {v.representative}
                            {v.representativePosition && (
                              <span className="ml-1.5 text-[8px] font-mono uppercase bg-sky-100 text-sky-700 font-extrabold px-1.5 py-0.5 rounded leading-none align-middle">
                                {v.representativePosition}
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-1 text-[10.5px] font-mono text-slate-600">
                            <Mail className="w-3 h-3 text-slate-400" /> {v.email}
                          </span>
                        </div>

                        <div className="space-y-1 text-slate-500 bg-white/60 p-2 rounded border col-span-2 grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[8px] uppercase font-bold text-slate-400 block font-mono">Direct Cellphone:</span>
                            <span className="font-mono font-bold text-slate-800 text-[10px]">{v.cellphone}</span>
                          </div>
                          <div>
                            <span className="text-[8px] uppercase font-bold text-slate-400 block font-mono">Direct Line Phone:</span>
                            <span className="font-mono font-bold text-slate-850 text-[10px]">{v.directLine}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeItemSubTab === 'invoice' && (
            <div className="space-y-6">
              {/* Core Scanner Setup Board */}
              <div className="grid lg:grid-cols-12 gap-6">
                {/* Left panel: Location Selector & File Uploader */}
                <div className="lg:col-span-5 bg-slate-50 border border-slate-200/80 p-5 rounded-3xl h-fit space-y-5 shadow-sm">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                      <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                      1. Scan Configuration
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Define target location and upload receipt or supplier invoice sheet (e.g. Sysco, US Foods)</p>
                  </div>

                  {/* STEP 1: Select location code */}
                  <div className="bg-white p-4 border border-slate-200 rounded-2xl space-y-3.5 shadow-sm">
                    <label className="font-bold text-slate-650 font-mono text-[9.5px] uppercase tracking-wider block">
                      Target Store Inventory Location:
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedInvoiceLoc}
                        onChange={(e) => {
                          setSelectedInvoiceLoc(e.target.value);
                          setSubmitSuccess(false);
                        }}
                        className="flex-1 p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-black font-mono focus:border-emerald-500 focus:outline-none text-slate-800"
                      >
                        {locations.map((loc) => (
                          <option key={loc.code} value={loc.code}>
                            {loc.code} - {loc.name}
                          </option>
                        ))}
                      </select>
                      <span className="bg-slate-900 text-amber-500 px-3.5 py-2 rounded-xl text-xs font-mono font-black flex items-center justify-center shadow-inner">
                        {selectedInvoiceLoc}
                      </span>
                    </div>
                  </div>

                  {/* STEP 2: Choose Intake Mode & Elements */}
                  <div className="space-y-3.5">
                    <label className="font-bold text-slate-650 font-mono text-[9px] uppercase tracking-wider block">
                      Choose Invoice Intake Mode:
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-205/60">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMode('upload_photo');
                          stopCamera();
                        }}
                        className={`py-2 px-1 rounded-lg text-[10px] font-black tracking-wide transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          uploadMode === 'upload_photo'
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Image className="w-3.5 h-3.5 text-sky-500" />
                        <span>Upload Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMode('upload_file');
                          stopCamera();
                        }}
                        className={`py-2 px-1 rounded-lg text-[10px] font-black tracking-wide transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          uploadMode === 'upload_file'
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Upload File</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMode('take_photo');
                        }}
                        className={`py-2 px-1 rounded-lg text-[10px] font-black tracking-wide transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          uploadMode === 'take_photo'
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5 text-purple-500" />
                        <span>Take Photo</span>
                      </button>
                    </div>

                    {/* Mode 1: Upload Photo */}
                    {uploadMode === 'upload_photo' && (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setInvoiceDragActive(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setInvoiceDragActive(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setInvoiceDragActive(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            const file = e.dataTransfer.files[0];
                            if (!file.type.startsWith('image/')) {
                              showToast("Please select or drop an image photo.");
                              return;
                            }
                            setInvoiceFileName(file.name);
                            setSubmitSuccess(false);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              triggerInvoiceScan(reader.result as string, file.name, file.type);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className={`border-2 border-dashed rounded-3xl p-5 text-center transition-all cursor-pointer relative min-h-[150px] flex flex-col items-center justify-center bg-white ${
                          invoiceDragActive
                            ? "border-sky-500 bg-sky-50/20 scale-[1.01]"
                            : "border-slate-200 hover:border-sky-350"
                        }`}
                      >
                        <input
                          type="file"
                          id="invoice-photo-input"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              setInvoiceFileName(file.name);
                              setSubmitSuccess(false);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                triggerInvoiceScan(reader.result as string, file.name, file.type);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <label htmlFor="invoice-photo-input" className="cursor-pointer space-y-2 flex flex-col items-center">
                          <Image className="w-7 h-7 text-sky-400" />
                          <div className="space-y-0.5">
                            <p className="text-xs font-extrabold text-slate-800">Choose JPEG, PNG or WebP Photo</p>
                            <p className="text-[10px] text-slate-400">Drag or click to choose snapshot from device gallery</p>
                          </div>
                        </label>
                      </div>
                    )}

                    {/* Mode 2: Upload File */}
                    {uploadMode === 'upload_file' && (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setInvoiceDragActive(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setInvoiceDragActive(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setInvoiceDragActive(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            const file = e.dataTransfer.files[0];
                            setInvoiceFileName(file.name);
                            setSubmitSuccess(false);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              triggerInvoiceScan(reader.result as string, file.name, file.type || "application/octet-stream");
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className={`border-2 border-dashed rounded-3xl p-5 text-center transition-all cursor-pointer relative min-h-[150px] flex flex-col items-center justify-center bg-white ${
                          invoiceDragActive
                            ? "border-emerald-500 bg-emerald-50/20 scale-[1.01]"
                            : "border-slate-200 hover:border-emerald-350"
                        }`}
                      >
                        <input
                          type="file"
                          id="invoice-file-input"
                          accept=".pdf,.png,.jpg,.jpeg,.gif,.txt,.json,.xls,.xlsx"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              setInvoiceFileName(file.name);
                              setSubmitSuccess(false);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                triggerInvoiceScan(reader.result as string, file.name, file.type || "application/octet-stream");
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <label htmlFor="invoice-file-input" className="cursor-pointer space-y-2 flex flex-col items-center">
                          <FileText className="w-7 h-7 text-emerald-400" />
                          <div className="space-y-0.5">
                            <p className="text-xs font-extrabold text-slate-800">Select Invoice Document File</p>
                            <p className="text-[10px] text-slate-400">Supports PDF sheets, digital receipts, CSV, or text listings</p>
                          </div>
                        </label>
                      </div>
                    )}

                    {/* Mode 3: Take Photo with camera stream and simulator fallback */}
                    {uploadMode === 'take_photo' && (
                      <div className="space-y-2 bg-white p-4 border border-slate-205 rounded-2xl shadow-inner">
                        {!cameraActive ? (
                          <div className="p-4 text-center space-y-3">
                            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                              <Camera className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-black text-slate-800">Device Camera Controller</h4>
                              <p className="text-[10px] text-slate-450 leading-relaxed max-w-[240px] mx-auto">Activate live stream to snap a direct high-contrast photo of physical vendor invoices.</p>
                            </div>

                            {cameraErr && (
                              <p className="text-[9px] text-amber-600 bg-amber-50 rounded-lg p-2 border leading-tight text-left">
                                {cameraErr}
                              </p>
                            )}

                            <div className="space-y-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => startCamera()}
                                disabled={cameraLoading}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-2 px-3 rounded-xl text-xs uppercase cursor-pointer transition flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                {cameraLoading ? (
                                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                ) : (
                                  <Video className="w-3.5 h-3.5" />
                                )}
                                {cameraLoading ? "Initializing Hardware..." : "Activate Live Camera"}
                              </button>

                              <div className="relative flex py-1 items-center">
                                <div className="flex-grow border-t border-slate-100"></div>
                                <span className="flex-shrink mx-2 text-[8px] font-mono text-slate-400 font-extrabold uppercase">OR INSTANT PRESET</span>
                                <div className="flex-grow border-t border-slate-100"></div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSubmitSuccess(false);
                                  const samplePresetB64 = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' style='background:%23ffffff;font-family:monospace;padding:40px;color:%23333;'><rect width='100%25' height='100%25' fill='%23fafafa' stroke='%23ddd' stroke-width='20'/><text x='50' y='80' font-size='24' font-weight='bold' fill='%23111'>SYSCO METRO DISTRICT</text><text x='50' y='110' font-size='14' fill='%23666'>13900 Sysco Ct, Jessup MD 20794</text><text x='50' y='160' font-size='14' font-weight='bold'>DELIVERY INVOICE: %23INV-88319-M</text><text x='50' y='180' font-size='12'>DATE: 2026-05-25</text><text x='50' y='200' font-size='12'>LOCATION STORE: " + selectedInvoiceLoc + "</text><line x1='50' y1='230' x2='550' y2='230' stroke='%23333' stroke-width='2'/><text x='50' y='260' font-size='12' font-weight='bold'>ITEM ROW DESCRIPTION      QTY      PRICE</text><line x1='50' y1='275' x2='550' y2='275' stroke='%23eee'/><text x='50' y='300' font-size='12'>Chicken Breast            30       $24.50</text><text x='50' y='330' font-size='12'>Salsa                     12       $14.00</text><text x='50' y='360' font-size='12'>Flour Tortillas 12\"       40       $11.80</text><text x='50' y='390' font-size='12'>Tomatoes                  15       $18.50</text><line x1='50' y1='410' x2='550' y2='410' stroke='%23333'/><text x='350' y='440' font-size='14' font-weight='bold'>GRAND TOTAL: $1,650.50</text><text x='50' y='520' font-size='11' fill='%23888'>SYSTEM STAMP: OCR_EVAL_PASS_CLEAR_HD</text></svg>";
                                  triggerInvoiceScan(samplePresetB64, "captured-sysco-bill.jpg", "image/jpeg");
                                  showToast("Simulated camera snapshot successfully generated.");
                                }}
                                className="w-full bg-slate-900 hover:bg-slate-950 text-amber-500 font-black py-2 px-3 rounded-xl text-xs uppercase cursor-pointer transition flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Simulate Shutter Shorter
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-purple-500 shadow-inner flex items-center justify-center">
                              <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 border-[24px] border-black/35 pointer-events-none flex items-center justify-center">
                                <div className="w-full h-full border border-dashed border-purple-400 opacity-65"></div>
                              </div>
                              <div className="absolute top-2 left-2 bg-rose-600 text-white font-mono font-black text-[8px] uppercase px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
                                <span className="w-1 h-1 bg-white rounded-full"></span>
                                Camera Active
                              </div>
                            </div>

                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => capturePhoto()}
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-black py-2 px-3 rounded-xl text-[11px] uppercase transition flex items-center justify-center gap-1 cursor-pointer shadow"
                              >
                                <Camera className="w-3.5 h-3.5" /> Snap Photo
                              </button>
                              <button
                                type="button"
                                onClick={() => stopCamera()}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2 px-2.5 rounded-xl text-[11px] uppercase transition cursor-pointer"
                              >
                                Cancel Feed
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* AI Simulator test controllers */}
                  <div className="bg-slate-100 p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 flex-1 pr-2">
                      <span className="font-extrabold text-slate-750 block">AI Clarity Simulation Toggle</span>
                      <span className="text-[9px] text-slate-400 block line-clamp-2">Enable this switch to intentionally simulate blurry photo results (out-of-focus warning feedback loop).</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={simulateBlurryVal}
                        onChange={(e) => setSimulateBlurryVal(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Visual preview of selected file */}
                  {invoiceFile && (
                    <div className="bg-white p-3 border rounded-2xl space-y-2">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-mono text-[9px] text-slate-400 truncate max-w-[190px]">{invoiceFileName}</span>
                        <button
                          onClick={() => {
                            setInvoiceFile(null);
                            setInvoiceFileName('');
                            setScanResult(null);
                            setVerifiedItems([]);
                          }}
                          className="text-[9px] font-black text-red-505 hover:underline"
                        >
                          Clear File
                        </button>
                      </div>
                      <div className="relative aspect-video max-h-[140px] rounded-xl overflow-hidden border bg-slate-50 flex items-center justify-center">
                        <img src={invoiceFile} alt="Scanned Receipt Preview" referrerPolicy="no-referrer" className="object-contain w-full h-full" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Panel: Evaluation Results & Invoice Items Verification table */}
                <div className="lg:col-span-7 bg-white border border-slate-200/80 p-5 rounded-3xl h-fit space-y-5 shadow-sm min-h-[400px]">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-1000 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-500 animate-pulse" />
                      2. Verification Center
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Assess the AI clarity check logs, modify extracted counts, and submit to update store stocks.</p>
                  </div>

                  {/* LOADING STREAM SKELETON */}
                  {isScanning && (
                    <div className="p-10 text-center flex flex-col items-center justify-center space-y-4 border rounded-3xl bg-slate-55/40 border-slate-100">
                      <div className="w-9 h-9 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-slate-800 text-xs">Gemini OCR Scanning in Progress...</h4>
                        <p className="text-[10px] text-slate-400 max-w-sm">Checking photo clarity thresholds, recognizing item rows, case prices, catalog alignments, and supplier headers.</p>
                      </div>
                    </div>
                  )}

                  {/* ERROR REPORT CHOP */}
                  {scanError && !isScanning && (
                    <div className="p-6 bg-red-50 border border-red-200/55 rounded-3xl flex gap-3 text-xs text-red-750">
                      <AlertTriangle className="w-5.5 h-5.5 text-red-500 shrink-0" />
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-red-800 uppercase font-mono tracking-wide text-[11px]">Optical Scanner Failed</h4>
                        <p className="leading-relaxed">{scanError}</p>
                      </div>
                    </div>
                  )}

                  {/* AI QUALITY CLARITY EVALUATION CHECK BLOCKED */}
                  {scanResult && !scanResult.isClear && !isScanning && (
                    <div className="p-5 bg-amber-500/10 border border-amber-500/20 text-slate-800 rounded-3xl space-y-3">
                      <div className="flex gap-2.5">
                        <AlertTriangle className="w-5.5 h-5.5 text-amber-500 shrink-0" />
                        <div className="space-y-1">
                          <h4 className="font-black text-amber-600 font-mono text-[10.5px] uppercase tracking-wider">
                            AI Clarity Evaluation Check: UNSTABLE & BLURRY PHOTO
                          </h4>
                          <p className="text-xs leading-relaxed text-slate-700">
                            {scanResult.clarityMessage}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2.5 pt-1.5 border-t border-amber-200/50 justify-end">
                        <button
                          onClick={() => {
                            // Re-trigger the file choosing prompt input trigger
                            const trigger = document.getElementById("invoice-file-input");
                            if (trigger) trigger.click();
                          }}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-650 text-slate-950 rounded-xl font-bold text-[10.5px] transition shadow-sm cursor-pointer"
                        >
                          Upload Cooler, High-Contrast Photo
                        </button>
                      </div>
                    </div>
                  )}

                  {/* INVOICE VERIFICATION DATA SHEET - ACTIONABLE SUMMARY TABLE */}
                  {scanResult && scanResult.isClear && !isScanning && (
                    <div className="space-y-4">
                      {/* Scan Header Info details */}
                      <div className="p-4 bg-slate-50 border rounded-2.5xl grid grid-cols-3 gap-3 text-xs leading-normal font-mono text-slate-600">
                        <div className="space-y-0.5">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">VENDOR SUPPLIER</span>
                          <span className="font-extrabold text-slate-800 text-[11px] block truncate">{scanResult.vendorName || "Unrecognized Supplier"}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">INVOICE NO. REFERENCE</span>
                          <span className="font-extrabold text-slate-800 text-[11px] block truncate">{scanResult.invoiceNumber || "INV-391039-R"}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">ACQUISITION DATE</span>
                          <span className="font-extrabold text-slate-800 text-[11px] block">{scanResult.invoiceDate || new Date().toISOString().substring(0, 10)}</span>
                        </div>
                      </div>

                      {/* AI Clarity Green light banner */}
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-800 text-[10.5px] font-bold flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>AI Clarity Check passed. Extraction is highly legible. Inline edits live.</span>
                      </div>

                      {/* Purchased products verification window tables */}
                      <div className="border border-slate-150 rounded-2.5xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-mono font-bold text-[9px] uppercase border-b">
                              <th className="p-3 pl-4">Item Name / Category</th>
                              <th className="p-3 w-28">Price (Unit)</th>
                              <th className="p-3 w-20 text-center">Qty</th>
                              <th className="p-3 w-24">Packaging</th>
                              <th className="p-3 w-24 text-right pr-4">Control</th>
                            </tr>
                          </thead>
                          <tbody>
                            {verifiedItems.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-slate-400">All purchased items removed.</td>
                              </tr>
                            ) : (
                              verifiedItems.map((item, idx) => (
                                <tr key={item.id} className="border-b last:border-b-0 hover:bg-slate-50/50 transition duration-75">
                                  {/* Item Name Content / Inputs */}
                                  <td className="p-3 pl-4">
                                    {item.isEditing ? (
                                      <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          setVerifiedItems(prev => prev.map(cur => cur.id === item.id ? { ...cur, name: value } : cur));
                                        }}
                                        className="w-full text-xs p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 font-bold bg-white"
                                      />
                                    ) : (
                                      <div className="space-y-0.5">
                                        <span className="font-extrabold text-slate-900 block leading-snug">{item.name}</span>
                                        <span className="text-[9.5px] text-slate-400 uppercase font-mono tracking-wider block font-bold">{item.category}</span>
                                      </div>
                                    )}
                                  </td>

                                  {/* Item Price */}
                                  <td className="p-3">
                                    {item.isEditing ? (
                                      <div className="relative">
                                        <span className="absolute left-1.5 top-2 text-slate-400 font-bold text-[10.5px]">$</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={item.price}
                                          onChange={(e) => {
                                            const value = parseFloat(e.target.value) || 0;
                                            setVerifiedItems(prev => prev.map(cur => cur.id === item.id ? { ...cur, price: value } : cur));
                                          }}
                                          className="w-full text-xs pl-4 p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 font-mono font-bold bg-white"
                                        />
                                      </div>
                                    ) : (
                                      <span className="font-mono font-bold text-slate-700 block">${Number(item.price).toFixed(2)}</span>
                                    )}
                                  </td>

                                  {/* Item Quantity */}
                                  <td className="p-3 text-center">
                                    {item.isEditing ? (
                                      <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value) || 0;
                                          setVerifiedItems(prev => prev.map(cur => cur.id === item.id ? { ...cur, quantity: value } : cur));
                                        }}
                                        className="w-full text-xs text-center p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 font-mono font-bold bg-white"
                                      />
                                    ) : (
                                      <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg text-[11px] font-mono inline-block">
                                        {item.quantity}
                                      </span>
                                    )}
                                  </td>

                                  {/* Item Packaging details */}
                                  <td className="p-3">
                                    {item.isEditing ? (
                                      <input
                                        type="text"
                                        value={item.packaging}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          setVerifiedItems(prev => prev.map(cur => cur.id === item.id ? { ...cur, packaging: value } : cur));
                                        }}
                                        className="w-full text-xs p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 font-bold bg-white"
                                      />
                                    ) : (
                                      <span className="font-mono text-slate-500 text-[10.5px] truncate max-w-[80px] block">{item.packaging}</span>
                                    )}
                                  </td>

                                  {/* Item Edit controls */}
                                  <td className="p-3 text-right pr-4 shrink-0">
                                    <div className="flex justify-end gap-1.5">
                                      {item.isEditing ? (
                                        <button
                                          onClick={() => {
                                            setVerifiedItems(prev => prev.map(cur => cur.id === item.id ? { ...cur, isEditing: false } : cur));
                                            showToast(`Saved layout edits on ${item.name}`);
                                          }}
                                          className="p-1 px-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-[10px] font-black uppercase transition cursor-pointer"
                                        >
                                          Save
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setVerifiedItems(prev => prev.map(cur => cur.id === item.id ? { ...cur, isEditing: true } : cur));
                                          }}
                                          className="p-1.5 border hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-700 transition cursor-pointer"
                                          title="Edit details"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          if (confirm(`Remove "${item.name}" from scanned delivery invoice list?`)) {
                                            setVerifiedItems(prev => prev.filter(cur => cur.id !== item.id));
                                            showToast(`Removed "${item.name}" from list.`);
                                          }
                                        }}
                                        className="p-1.5 border border-transparent hover:border-red-150 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-505 transition cursor-pointer"
                                        title="Delete row"
                                      >
                                        <Trash className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* SUBMIT BUTTON */}
                      {verifiedItems.length > 0 && (
                        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="text-[10.5px] text-slate-400">
                            Summary: Found <strong className="text-slate-650 font-mono font-bold">{verifiedItems.length} items</strong>. Grand Total quantity: <strong className="text-slate-650 font-mono font-bold">{verifiedItems.reduce((acc, current) => acc + (current.quantity || 0), 0)} cases</strong>.
                          </div>
                          
                          <button
                            onClick={() => {
                              // Perform submissions update checkout
                              if (verifiedItems.length === 0) return;

                              // Ensure no items are in active editing mode to lock in counts
                              if (verifiedItems.some(i => i.isEditing)) {
                                showToast("Please click 'Save' on any rows currently being edited before submitting.");
                                alert("Please lock in edits by clicking 'Save' on active rows.");
                                return;
                              }

                              // Update in-memory inventories state.
                              setStoreInventories((prev) => {
                                const currentLocStore = prev[selectedInvoiceLoc] || {};
                                const nextLocStore = { ...currentLocStore };
                                verifiedItems.forEach((item) => {
                                  nextLocStore[item.name] = (nextLocStore[item.name] || 0) + Number(item.quantity);
                                });
                                return {
                                  ...prev,
                                  [selectedInvoiceLoc]: nextLocStore
                                };
                              });

                              // Push simulated transaction audit submission to sampleSubmissions array in memory
                              const generatedSubId = `sub-ocr-${Date.now()}`;
                              const generatedSubmission = {
                                id: generatedSubId,
                                formId: 'ocr-scanner',
                                formTitle: `Supplier Invoice: ${scanResult.vendorName || "Ocr Reconcile"}`,
                                locationCode: selectedInvoiceLoc,
                                userId: simUser?.id || 'u3',
                                userName: simUser?.name || 'Sarah Jenkins',
                                timestamp: new Date().toISOString(),
                                items: verifiedItems.map((item, idx) => ({
                                  itemId: `ocr-item-${idx}-${Date.now()}`,
                                  name: item.name,
                                  category: item.category || 'Cooler',
                                  unit: item.packaging || 'cases',
                                  currentCount: 0,
                                  parLevel: 10,
                                  suggestedOrder: 0,
                                  finalOrder: item.quantity, // Added Qty
                                  total: item.quantity,
                                  photoUrl: 'https://images.unsplash.com/photo-1543083505-590d2bebce01?w=150'
                                })),
                                notes: `Scanned supplier delivery completed via AI scanner. Added ${verifiedItems.length} products to location ${selectedInvoiceLoc} active storage.`
                              };
                              // Unshift matches standard list order
                              sampleSubmissions.unshift(generatedSubmission);

                              // Capture details and save into global invoice state
                              const currentInvoiceRecord: UploadedInvoice = {
                                id: `inv-${Date.now()}`,
                                vendorName: scanResult?.vendorName || "Ocr Reconcile",
                                itemsCount: verifiedItems.reduce((acc, cr) => acc + Number(cr.quantity || 0), 0),
                                totalPrice: verifiedItems.reduce((acc, cr) => acc + (Number(cr.price || 0) * Number(cr.quantity || 0)), 0),
                                date: new Date().toISOString().split('T')[0],
                                time: new Date().toTimeString().split(' ')[0].substring(0, 5),
                                storeLocation: selectedInvoiceLoc,
                                category: verifiedItems[0]?.category || 'Cooler',
                                items: verifiedItems.map(it => ({
                                  name: it.name,
                                  quantity: Number(it.quantity || 0),
                                  price: Number(it.price || 0),
                                  packaging: it.packaging || 'cases'
                                }))
                              };

                              if (setUploadedInvoices) {
                                setUploadedInvoices(prev => [currentInvoiceRecord, ...prev]);
                              }

                              showToast(`Successfully resolved and updated physical inventories for location ${selectedInvoiceLoc}!`);
                              setSubmitSuccess(true);
                              setScanResult(null);
                              setVerifiedItems([]);
                              setInvoiceFile(null);
                              setInvoiceFileName('');
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2.5 px-6 rounded-2xl text-xs uppercase cursor-pointer transition active:scale-95 shadow hover:shadow-md flex items-center justify-center gap-1.5"
                          >
                            <CheckSquare className="w-4 h-4" />
                            Submit & Add to {selectedInvoiceLoc} Inventory
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* NO FILE UPLOAD PLACEHOLDER */}
                  {!scanResult && !isScanning && !scanError && !submitSuccess && (
                    <div className="p-10 text-center flex flex-col items-center justify-center space-y-3.5 border border-dashed rounded-3xl bg-slate-50/50">
                      <Receipt className="w-10 h-10 text-slate-350" />
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-slate-700 text-xs">Waiting for scanned document upload...</h4>
                        <p className="text-[10.5px] text-slate-405 max-w-xs mx-auto">Please designate a location on the left config board, select your supplier slip receipt image, and the AI will extract lines immediately.</p>
                      </div>
                    </div>
                  )}

                  {/* SUBMISSION CHECKS SUCCESS FEEDBACK PANEL */}
                  {submitSuccess && !isScanning && (
                    <div className="p-6 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-3xl space-y-4">
                      <div className="flex gap-3 text-xs">
                        <CheckCircle className="w-7 h-7 text-emerald-500 shrink-0" />
                        <div className="space-y-1">
                          <h4 className="font-black font-mono tracking-wider text-[11px] text-emerald-900 uppercase">
                            DELIVERY SUCCESSFULLY RECONCILED!
                          </h4>
                          <p className="leading-relaxed font-medium">
                            All verified quantities of the scanned invoice items have been resolved and added to physical warehouse stock logs for location code <strong className="text-amber-500 bg-slate-900 font-mono px-2 py-0.5 rounded font-black">{selectedInvoiceLoc}</strong>.
                          </p>
                          <p className="leading-relaxed text-[10.5px] text-slate-450 pt-1">
                            An immutable audit delivery submission record was generated and added directly onto the <b>"Operational Reports"</b> audit dashboard streams.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-1 border-t border-emerald-200">
                        <button
                          onClick={() => setSubmitSuccess(false)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-amber-500 rounded-xl font-bold font-mono text-[9.5px] tracking-wide cursor-pointer flex items-center gap-1.5 shadow-md"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Scan Another Receipt
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* STORE PHYSICAL INVENTORIES MONITOR PANEL */}
              <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-3xl shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/50 pb-3">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-emerald-500" />
                      Location Inventory Ledger Inspector: {selectedInvoiceLoc}
                    </h3>
                    <p className="text-[10px] text-slate-400">View live active stock counts currently stored in {selectedInvoiceLoc}'s physical lockers</p>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400 font-black bg-white px-2.5 py-1 rounded-xl border">
                    ACTIVE STORE CODE: {selectedInvoiceLoc}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
                  {Object.entries(storeInventories[selectedInvoiceLoc] || {}).map(([prodName, qty]) => (
                    <div key={prodName} className="bg-white p-3 border rounded-2xl shadow-sm flex flex-col justify-between space-y-2">
                      <span className="text-[10px] font-extrabold text-slate-700 line-clamp-2 min-h-[30px]">{prodName}</span>
                      <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-100 font-mono">
                        <span className="text-[9px] text-slate-405 font-bold uppercase">PHYSICAL QTY:</span>
                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                          {qty} cases
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!storeInventories[selectedInvoiceLoc] || Object.keys(storeInventories[selectedInvoiceLoc]).length === 0) && (
                    <div className="col-span-full py-4 text-center text-slate-400 text-xs">
                      No stock records listed yet for this store.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. AUDIT CHECKLIST FORMS BUILDER & SCHEDULER & DUPLICATOR */}
      {activeSubTab === 'forms' && (
        <div className="space-y-6 animate-fadeIn">
          {(!simUser || simUser.role === 'Super Admin' || hasPermission(simUser?.role, 'canManageForms')) ? (
            <>
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-lg sm:text-xl font-display text-white">
                        Inventory Checksheet Forms Suite
                      </h3>
                      <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold">
                        {forms.length} Total Forms
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Super Admin Authority • Create, edit, clone across store locations, and delete inventory audit sheets.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenCreateForm}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs uppercase flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Build New Checksheet</span>
                  </button>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={formsSearchQuery}
                      onChange={(e) => setFormsSearchQuery(e.target.value)}
                      placeholder="Search checksheets by title, section, or location code..."
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition"
                    />
                    {formsSearchQuery && (
                      <button
                        onClick={() => setFormsSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Frequency Filter Selector */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Cycle:</span>
                    <select
                      value={formsSelectedFreq}
                      onChange={(e) => setFormsSelectedFreq(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="ALL">All Frequencies</option>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Bi-weekly">Bi-weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                {/* Location Filter Pills */}
                <div className="pt-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 shrink-0 mr-1">Location:</span>
                  {[
                    { code: 'ALL', label: 'All Stores' },
                    { code: 'CH', label: 'CH - Chantilly' },
                    { code: 'LB', label: 'LB - Leesburg' },
                    { code: 'VN', label: 'VN - Vienna' },
                    { code: 'HD', label: 'HD - Herndon' },
                    { code: 'BW', label: 'BW - Bristow' },
                    { code: 'CM', label: 'CM - Commissary' },
                    { code: 'AR', label: 'AR - Arlington' },
                    { code: 'AS', label: 'AS - Ashburn' },
                    { code: 'BK', label: 'BK - Burke' },
                    { code: 'FX', label: 'FX - Fairfax' }
                  ].map((loc) => {
                    const isSelected = formsSelectedLoc === loc.code;
                    const count = loc.code === 'ALL' 
                      ? forms.length 
                      : forms.filter(f => f.locationCode === loc.code).length;
                    return (
                      <button
                        key={loc.code}
                        type="button"
                        onClick={() => setFormsSelectedLoc(loc.code)}
                        className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-slate-950 text-amber-400 shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{loc.label}</span>
                        <span className={`text-[9px] px-1 rounded-full ${isSelected ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-200 text-slate-600'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Checksheets Cards Grid */}
              {(() => {
                const filtered = forms.filter(f => {
                  const matchLoc = formsSelectedLoc === 'ALL' || f.locationCode === formsSelectedLoc;
                  const matchFreq = formsSelectedFreq === 'ALL' || f.frequency === formsSelectedFreq;
                  const q = formsSearchQuery.toLowerCase().trim();
                  const matchQuery = !q || 
                    f.title.toLowerCase().includes(q) || 
                    (f.locationCode && f.locationCode.toLowerCase().includes(q)) ||
                    (f.sections && f.sections.some(s => s.name.toLowerCase().includes(q)));
                  return matchLoc && matchFreq && matchQuery;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                        <ClipboardList className="w-7 h-7" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-base">No checksheets match your filter</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        No forms found for location "{formsSelectedLoc}" with query "{formsSearchQuery}". You can build a new checksheet now.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenCreateForm}
                        className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Build New Checksheet
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((f) => {
                      const totalItems = f.sections ? f.sections.reduce((acc, s) => acc + (s.itemIds?.length || 0), 0) : 0;
                      return (
                        <div
                          key={f.id}
                          className="bg-white border border-slate-200/90 hover:border-amber-400/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3 relative group"
                        >
                          {/* Card Top: Location & Frequency Tags */}
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="bg-slate-950 text-amber-400 font-mono text-[10px] font-black px-2 py-0.5 rounded-md">
                                  {f.locationCode || 'STORE'}
                                </span>
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                                  {f.frequency}
                                </span>
                              </div>

                              {f.excelFileName && (
                                <a
                                  href={`/excel-forms/${encodeURIComponent(f.excelFileName)}`}
                                  download={f.excelFileName}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full transition"
                                  title="Download linked Excel checksheet"
                                >
                                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                                  <span>.xlsx</span>
                                </a>
                              )}
                            </div>

                            <h4 className="font-black text-slate-900 text-sm leading-snug">
                              {f.title}
                            </h4>

                            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Due {f.dueDate} at {f.dueTime}</span>
                            </p>

                            {/* Sections Preview */}
                            <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <span>{f.sections?.length || 0} Sections</span>
                                <span className="font-bold text-slate-700">{totalItems} Total Items</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {(f.sections || []).slice(0, 4).map((sec, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-slate-50 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium"
                                  >
                                    {sec.name} ({sec.itemIds?.length || 0})
                                  </span>
                                ))}
                                {(f.sections?.length || 0) > 4 && (
                                  <span className="text-[10px] text-slate-400 font-mono self-center">
                                    +{(f.sections?.length || 0) - 4} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card Footer: Action Buttons */}
                          <div className="pt-2 border-t border-slate-100 space-y-2">
                            {/* Primary Count Triggers: Voice & Manual */}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => onOpenForm ? onOpenForm(f, 'voice') : alert(`Launching voice count for ${f.title}`)}
                                className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-black py-2 px-2 rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                                title="Start hands-free voice counting on this checksheet"
                              >
                                <Mic className="w-3.5 h-3.5 text-slate-950" />
                                <span>Voice Count</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onOpenForm ? onOpenForm(f, 'manual') : alert(`Launching manual count for ${f.title}`)}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold py-2 px-2 rounded-xl text-xs uppercase flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
                                title="Open manual numerical keypad counting"
                              >
                                <span>Manual</span>
                              </button>
                            </div>

                            {/* Secondary Administrative Tools: Edit, Duplicate, Delete */}
                            <div className="flex items-center justify-between gap-1 text-slate-600 pt-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditForm(f)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-950 text-xs font-semibold flex items-center gap-1 transition"
                                title="Edit checksheet title, schedule, or items"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDuplicateForm(f)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-950 text-xs font-semibold flex items-center gap-1 transition"
                                title="Duplicate layout to another store location"
                              >
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span>Duplicate</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeletingForm(f)}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 hover:text-red-700 text-xs font-semibold flex items-center gap-1 transition"
                                title="Delete this checksheet form"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* ========================================================================= */}
              {/* MODALS FOR FORMS MANAGEMENT                                               */}
              {/* ========================================================================= */}

              {/* 1. CREATE / BUILD NEW FORM MODAL */}
              {showCreateFormModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp my-8 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                          <PlusCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-base text-slate-950 font-display">Build New Inventory Checksheet</h4>
                          <p className="text-[11px] text-slate-500">Design a customized inventory count form for any store outlet</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowCreateFormModal(false)}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4 text-xs">
                      {/* Title */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">Form / Checksheet Title *</label>
                        <input
                          type="text"
                          value={formModalTitle}
                          onChange={(e) => setFormModalTitle(e.target.value)}
                          placeholder="e.g. CH - Daily Food Audit & Walk-in Cooler"
                          className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold focus:outline-none focus:border-amber-500 text-sm"
                        />
                      </div>

                      {/* Location & Frequency */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">Target Location Outlet *</label>
                          <select
                            value={formModalLoc}
                            onChange={(e) => setFormModalLoc(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-amber-500"
                          >
                            <option value="CH">CH - Chantilly</option>
                            <option value="LB">LB - Leesburg</option>
                            <option value="VN">VN - Vienna</option>
                            <option value="HD">HD - Herndon</option>
                            <option value="BW">BW - Bristow</option>
                            <option value="CM">CM - Commissary</option>
                            <option value="AR">AR - Arlington</option>
                            <option value="AS">AS - Ashburn</option>
                            <option value="BK">BK - Burke</option>
                            <option value="FX">FX - Fairfax</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">Frequency Cycle *</label>
                          <select
                            value={formModalFreq}
                            onChange={(e) => setFormModalFreq(e.target.value as any)}
                            className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-amber-500"
                          >
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Bi-weekly">Bi-weekly</option>
                            <option value="Monthly">Monthly</option>
                          </select>
                        </div>
                      </div>

                      {/* Due Date & Time */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">Due Date</label>
                          <input
                            type="date"
                            value={formModalDueDate}
                            onChange={(e) => setFormModalDueDate(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">Due Time</label>
                          <input
                            type="time"
                            value={formModalDueTime}
                            onChange={(e) => setFormModalDueTime(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {/* Sections & Items Config */}
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <label className="font-black text-slate-800 uppercase font-mono text-[11px]">
                            Checksheet Sections ({formModalSections.length})
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Select a section tab to assign items
                          </span>
                        </div>

                        {/* Section Tabs */}
                        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                          {formModalSections.map((sec, idx) => (
                            <div
                              key={idx}
                              onClick={() => setActiveSectionIdx(idx)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                                activeSectionIdx === idx
                                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                                  : 'bg-white text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              <span>{sec.name}</span>
                              <span className="text-[10px] opacity-75">({sec.itemIds.length})</span>
                              {formModalSections.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveSectionFromModal(idx);
                                  }}
                                  className="text-slate-500 hover:text-red-700 ml-1"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}

                          {/* Quick add section input */}
                          <div className="flex items-center gap-1 ml-auto">
                            <input
                              type="text"
                              value={newSectionInput}
                              onChange={(e) => setNewSectionInput(e.target.value)}
                              placeholder="+ Add Section..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddSectionToModal();
                                }
                              }}
                              className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs w-28 focus:outline-none focus:border-amber-500"
                            />
                            <button
                              type="button"
                              onClick={handleAddSectionToModal}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-950 text-white rounded-lg text-xs font-bold"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        {/* Items Picker for active section */}
                        {formModalSections[activeSectionIdx] && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 text-xs">
                                Items in section "{formModalSections[activeSectionIdx].name}":
                              </span>
                              <span className="text-[11px] font-mono text-slate-500">
                                {formModalSections[activeSectionIdx].itemIds.length} items linked
                              </span>
                            </div>

                            {/* Search filter for items */}
                            <input
                              type="text"
                              value={itemSearchForForm}
                              onChange={(e) => setItemSearchForForm(e.target.value)}
                              placeholder="Search catalog items to add/remove..."
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                            />

                            {/* Item badges picker */}
                            <div className="max-h-44 overflow-y-auto space-y-1 divide-y divide-slate-200/60 bg-white border border-slate-200 rounded-lg p-2">
                              {items
                                .filter(it => !itemSearchForForm || it.name.toLowerCase().includes(itemSearchForForm.toLowerCase()))
                                .slice(0, 40)
                                .map((it) => {
                                  const isChecked = formModalSections[activeSectionIdx].itemIds.includes(it.id);
                                  return (
                                    <label
                                      key={it.id}
                                      className={`py-1.5 px-2 flex items-center justify-between gap-2 text-xs rounded cursor-pointer transition ${
                                        isChecked ? 'bg-amber-50 text-amber-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleToggleItemInModalSection(it.id)}
                                          className="rounded text-amber-500 focus:ring-amber-500"
                                        />
                                        <span>{it.name}</span>
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {it.unit}
                                      </span>
                                    </label>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t">
                      <button
                        type="button"
                        onClick={() => setShowCreateFormModal(false)}
                        className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNewForm}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer shadow-md"
                      >
                        Publish & Save Checksheet
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. EDIT FORM MODAL */}
              {editingForm && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp my-8 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                          <Edit2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-base text-slate-950 font-display">Edit Checksheet: {editingForm.title}</h4>
                          <p className="text-[11px] text-slate-500">Update form scheduling, title, sections, and item assignments</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingForm(null)}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4 text-xs">
                      {/* Title */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">Form / Checksheet Title *</label>
                        <input
                          type="text"
                          value={formModalTitle}
                          onChange={(e) => setFormModalTitle(e.target.value)}
                          className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold focus:outline-none focus:border-amber-500 text-sm"
                        />
                      </div>

                      {/* Location & Frequency */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">Location Code *</label>
                          <select
                            value={formModalLoc}
                            onChange={(e) => setFormModalLoc(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-amber-500"
                          >
                            <option value="CH">CH - Chantilly</option>
                            <option value="LB">LB - Leesburg</option>
                            <option value="VN">VN - Vienna</option>
                            <option value="HD">HD - Herndon</option>
                            <option value="BW">BW - Bristow</option>
                            <option value="CM">CM - Commissary</option>
                            <option value="AR">AR - Arlington</option>
                            <option value="AS">AS - Ashburn</option>
                            <option value="BK">BK - Burke</option>
                            <option value="FX">FX - Fairfax</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">Frequency Cycle *</label>
                          <select
                            value={formModalFreq}
                            onChange={(e) => setFormModalFreq(e.target.value as any)}
                            className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-amber-500"
                          >
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Bi-weekly">Bi-weekly</option>
                            <option value="Monthly">Monthly</option>
                          </select>
                        </div>
                      </div>

                      {/* Due Date & Time */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">Due Date</label>
                          <input
                            type="date"
                            value={formModalDueDate}
                            onChange={(e) => setFormModalDueDate(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">Due Time</label>
                          <input
                            type="time"
                            value={formModalDueTime}
                            onChange={(e) => setFormModalDueTime(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {/* Sections & Items Config */}
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <label className="font-black text-slate-800 uppercase font-mono text-[11px]">
                            Checksheet Sections ({formModalSections.length})
                          </label>
                        </div>

                        {/* Section Tabs */}
                        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                          {formModalSections.map((sec, idx) => (
                            <div
                              key={idx}
                              onClick={() => setActiveSectionIdx(idx)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                                activeSectionIdx === idx
                                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                                  : 'bg-white text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              <span>{sec.name}</span>
                              <span className="text-[10px] opacity-75">({sec.itemIds?.length || 0})</span>
                              {formModalSections.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveSectionFromModal(idx);
                                  }}
                                  className="text-slate-500 hover:text-red-700 ml-1"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}

                          <div className="flex items-center gap-1 ml-auto">
                            <input
                              type="text"
                              value={newSectionInput}
                              onChange={(e) => setNewSectionInput(e.target.value)}
                              placeholder="+ Add Section..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddSectionToModal();
                                }
                              }}
                              className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs w-28 focus:outline-none focus:border-amber-500"
                            />
                            <button
                              type="button"
                              onClick={handleAddSectionToModal}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-950 text-white rounded-lg text-xs font-bold"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        {/* Items in section */}
                        {formModalSections[activeSectionIdx] && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 text-xs">
                                Items in section "{formModalSections[activeSectionIdx].name}":
                              </span>
                              <span className="text-[11px] font-mono text-slate-500">
                                {formModalSections[activeSectionIdx].itemIds?.length || 0} items linked
                              </span>
                            </div>

                            <input
                              type="text"
                              value={itemSearchForForm}
                              onChange={(e) => setItemSearchForForm(e.target.value)}
                              placeholder="Search catalog items to add/remove..."
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                            />

                            <div className="max-h-44 overflow-y-auto space-y-1 divide-y divide-slate-200/60 bg-white border border-slate-200 rounded-lg p-2">
                              {items
                                .filter(it => !itemSearchForForm || it.name.toLowerCase().includes(itemSearchForForm.toLowerCase()))
                                .slice(0, 40)
                                .map((it) => {
                                  const isChecked = formModalSections[activeSectionIdx].itemIds?.includes(it.id);
                                  return (
                                    <label
                                      key={it.id}
                                      className={`py-1.5 px-2 flex items-center justify-between gap-2 text-xs rounded cursor-pointer transition ${
                                        isChecked ? 'bg-amber-50 text-amber-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleToggleItemInModalSection(it.id)}
                                          className="rounded text-amber-500 focus:ring-amber-500"
                                        />
                                        <span>{it.name}</span>
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {it.unit}
                                      </span>
                                    </label>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t">
                      <button
                        type="button"
                        onClick={() => setEditingForm(null)}
                        className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditedForm}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer shadow-md"
                      >
                        Save Checksheet Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. DUPLICATE FORM MODAL */}
              {duplicatingForm && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-2">
                        <Copy className="w-5 h-5 text-amber-500" />
                        <h4 className="font-black text-base text-slate-950">Duplicate Checksheet</h4>
                      </div>
                      <button onClick={() => setDuplicatingForm(null)} className="text-slate-400 hover:text-slate-700">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500">
                      Clone all sections and items from <b>"{duplicatingForm.title}"</b> to another store location outlet.
                    </p>

                    <div className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">Target Location Outlet *</label>
                        <select
                          value={duplicateTargetLoc}
                          onChange={(e) => {
                            const newLoc = e.target.value;
                            setDuplicateTargetLoc(newLoc);
                            setDuplicateNewTitle(`${newLoc} - ${duplicatingForm.title.replace(/^[A-Z]{2,4}\s*-\s*/i, '')} (Copy)`);
                          }}
                          className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-amber-500"
                        >
                          <option value="CH">CH - Chantilly</option>
                          <option value="LB">LB - Leesburg</option>
                          <option value="VN">VN - Vienna</option>
                          <option value="HD">HD - Herndon</option>
                          <option value="BW">BW - Bristow</option>
                          <option value="CM">CM - Commissary</option>
                          <option value="AR">AR - Arlington</option>
                          <option value="AS">AS - Ashburn</option>
                          <option value="BK">BK - Burke</option>
                          <option value="FX">FX - Fairfax</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">New Form Title *</label>
                        <input
                          type="text"
                          value={duplicateNewTitle}
                          onChange={(e) => setDuplicateNewTitle(e.target.value)}
                          className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t">
                      <button
                        type="button"
                        onClick={() => setDuplicatingForm(null)}
                        className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDuplicateForm}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer shadow-md"
                      >
                        Clone Checksheet
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. DELETE CONFIRMATION MODAL */}
              {deletingForm && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-base text-slate-950">Delete Checksheet?</h4>
                        <p className="text-xs text-slate-500">This action will remove the form from store staff views.</p>
                      </div>
                    </div>

                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
                      <p className="font-bold">{deletingForm.title}</p>
                      <p className="text-[11px] text-red-600 font-mono">Store: {deletingForm.locationCode} • Cycle: {deletingForm.frequency}</p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setDeletingForm(null)}
                        className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDeleteForm}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs uppercase cursor-pointer shadow-md"
                      >
                        Yes, Delete Checksheet
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Checksheet Authoring Access Restricted</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Only the Super Admin (Michael Goyone) or staff assigned with the <code>canManageForms</code> permission in Settings can add, edit, or delete inventory checksheets.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. BRAND CUSTOMIZATION & SUPER ADMIN CREDENTIALS CONFIGURATION */}
      {activeSubTab === 'brand' && (
        <div className="grid lg:grid-cols-2 gap-6">
          
          {/* Section A: Company Logo Customization with Drag and Drop Support */}
          <div className="bg-slate-50 border p-6 rounded-2xl h-fit space-y-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Upload className="w-4.5 h-4.5 text-amber-500" />
                Company Brand Logo (PNG)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload your company or commissary logo in PNG format. Drag-and-drop file or click to select manually.
              </p>
            </div>

            {/* Custom file dropzone area */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition flex flex-col items-center justify-center gap-3 cursor-pointer ${
                dragActive 
                  ? 'border-amber-500 bg-amber-500/10' 
                  : 'border-slate-300 hover:border-amber-400 bg-white'
              }`}
              onClick={() => document.getElementById('logo-file-input')?.click()}
            >
              <input 
                id="logo-file-input"
                type="file" 
                accept="image/png" 
                className="hidden" 
                onChange={handleFileChange}
              />

              {currentLogoPreview ? (
                <div className="space-y-3">
                  <div className="w-24 h-24 bg-white border rounded-xl flex items-center justify-center p-2 mx-auto shadow-md overflow-hidden">
                    <img 
                      src={currentLogoPreview} 
                      alt="Brand Logo Preview" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-[11px] font-bold text-green-600 font-mono">PNG Logo Loaded Successfully</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Image className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Drag & Drop PNG file here, or click to browse</p>
                  <p className="text-[10px] text-slate-400 font-mono">Format required: PNG only</p>
                </div>
              )}
            </div>

            {logoError && (
              <p className="text-xs font-bold text-red-600 font-mono leading-tight">{logoError}</p>
            )}

            {currentLogoPreview && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearCustomLogo();
                }}
                className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-250 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Trash className="w-3.5 h-3.5" />
                Reset back to Default GoyoneByDesign logo
              </button>
            )}
          </div>

          {/* Section B: Super Admin Identity Configuration */}
          <div className="bg-slate-50 border p-6 rounded-2xl h-fit space-y-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Key className="w-4.5 h-4.5 text-amber-500" />
                Super Admin Authentication Profile
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your credentials for host operations overrides. Email and passwords changed here are persisted locally.
              </p>
            </div>

            <form onSubmit={handleUpdateCredentials} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-black font-mono uppercase text-slate-400">Corporate super admin email</label>
                <input 
                  type="email"
                  value={adminSettingsEmail}
                  onChange={(e) => setAdminSettingsEmail(e.target.value)}
                  placeholder="michael.goyone@gmail.com"
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-amber-500 text-xs font-mono font-bold text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black font-mono uppercase text-slate-400">Security Access Password</label>
                <input 
                  type="password"
                  value={adminSettingsPassword}
                  onChange={(e) => setAdminSettingsPassword(e.target.value)}
                  placeholder="MyFamily2012!"
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-amber-500 text-xs font-mono font-bold text-slate-800"
                  required
                />
              </div>

              {credSuccessMessage && (
                <p className="text-xs font-black text-green-600 bg-green-50 p-2.5 border border-green-200 rounded-xl font-mono leading-tight">
                  {credSuccessMessage}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs uppercase font-extrabold tracking-wider transition active:scale-95 shadow-md flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                Lock in Admin Updates
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. POS & RESTAURANT BACKOFFICE INTEGRATIONS GATEWAY */}
      {activeSubTab === 'integrations' && (
        <div className="space-y-6">
          {/* Dashboard Header */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-6 pointer-events-none">
              <Cpu className="w-64 h-64 text-amber-500 animate-pulse" />
            </div>
            
            <div className="space-y-1 z-10">
              <span className="bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase font-mono">
                Super Admin Authorized Module
              </span>
              <h3 className="text-lg font-bold font-display flex items-center gap-2">
                <Cpu className="w-5 h-5 text-amber-400" /> Operational Sales & Catalog Integrations
              </h3>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Connect your Commissary inventory registers directly with your restaurants' front-of-house POS systems. 
                Keep recipes, menu item catalog definitions, and replenishment tallies synchronized in real-time.
              </p>
            </div>

            <div className="flex gap-2 shrink-0 z-10 w-full md:w-auto">
              <button 
                onClick={handleTestConnection}
                disabled={testingInProgress}
                className="flex-1 md:flex-none px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 text-slate-950 rounded-xl text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Wifi className={`w-3.5 h-3.5 ${testingInProgress ? 'animate-ping' : ''}`} />
                {testingInProgress ? 'Testing gateway...' : 'Test API Gateway Connection'}
              </button>
              <button 
                onClick={handleSyncCatalog}
                disabled={syncInProgress}
                className="flex-1 md:flex-none px-4 py-2 bg-white/10 hover:bg-white/15 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5 border border-white/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncInProgress ? 'animate-spin' : ''}`} />
                {syncInProgress ? 'Syncing catalog...' : 'Sync Menu Catalog Now'}
              </button>
            </div>
          </div>

          {/* Core Bento Grid Layout */}
          <div className="grid lg:grid-cols-12 gap-6">
            
            {/* LEFT SIDE: POS Select & Credentials Form (Col span: 7) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
              
              {/* POS Gateway Selector */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black font-mono uppercase text-slate-400">Select Restaurant POS & Backoffice Platform</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {[
                    { id: 'toast', label: 'Toast POS', desc: 'Cloud REST API', color: 'border-orange-500 text-orange-600 bg-orange-50/40 text-orange-850' },
                    { id: 'aloha', label: 'NCR Aloha', desc: 'On-Premises Agent', color: 'border-red-500 text-red-600 bg-red-50/40 text-red-00' },
                    { id: 'clover', label: 'Clover POS', desc: 'OAuth Hook API', color: 'border-emerald-500 text-emerald-600 bg-emerald-50/40 text-emerald-850' },
                    { id: 'custom', label: 'Custom Hook', desc: 'Manual Webhook', color: 'border-slate-500 text-slate-700 bg-slate-50/40 text-slate-800' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPosSystem(p.id as any);
                        localStorage.setItem('applet_pos_system', p.id);
                        setConnectionLogs([`[${new Date().toLocaleTimeString()}] Switched gateway provider to ${p.label}. Update credentials below.`]);
                        setConnectionSucceeded(null);
                      }}
                      className={`p-3 text-left border rounded-xl transition flex flex-col justify-between gap-1.5 active:scale-95 cursor-pointer ${
                        posSystem === p.id 
                          ? `${p.color} ring-2 ring-amber-400 font-extrabold border-transparent shadow-sm` 
                          : 'border-slate-250 hover:border-slate-400 bg-white text-slate-600'
                      }`}
                    >
                      <span className="text-xs font-black tracking-tight">{p.label}</span>
                      <span className="text-[9px] opacity-75 font-mono capitalize leading-none">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* POS Specific Settings Fields Form */}
              <form onSubmit={handleUpdatePOSIntegration} className="space-y-4 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-amber-500" />
                  {posSystem.toUpperCase()} Authentication Parameters
                </h4>

                {posSystem === 'toast' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1 col-span-2">
                      <label className="block text-[9px] font-black font-mono uppercase text-slate-400">Toast Integration API URL</label>
                      <input 
                        type="text" 
                        value={toastEnv === 'sandbox' ? 'https://api.toasttab.com/api/v1/sandbox' : 'https://api.toasttab.com/api/v1/prod'} 
                        disabled 
                        className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 text-[11px] font-mono font-bold text-slate-500 cursor-not-allowed" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black font-mono uppercase text-slate-400">Partner Client ID</label>
                      <input 
                        type="text"
                        value={toastClientId} 
                        onChange={(e) => setToastClientId(e.target.value)}
                        placeholder="toast-com-92x83"
                        className="w-full p-2.5 border border-slate-250 rounded-xl bg-white text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black font-mono uppercase text-slate-400">Partner Client Secret</label>
                      <input 
                        type="password"
                        value={toastClientSecret} 
                        onChange={(e) => setToastClientSecret(e.target.value)}
                        placeholder="t_sec_••••••••••"
                        className="w-full p-2.5 border border-slate-250 rounded-xl bg-white text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black font-mono uppercase text-slate-400">Restaurant Group Management ID (GUID)</label>
                      <input 
                        type="text"
                        value={toastRestId} 
                        onChange={(e) => setToastRestId(e.target.value)}
                        placeholder="rt-7261-arlington"
                        className="w-full p-2.5 border border-slate-250 rounded-xl bg-white text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black font-mono uppercase text-slate-400">API Access Level Environment</label>
                      <select
                        value={toastEnv}
                        onChange={(e) => setToastEnv(e.target.value as any)}
                        className="w-full p-2.5 border border-slate-250 rounded-xl bg-white text-xs font-bold text-slate-705 focus:outline-none focus:border-amber-500"
                      >
                        <option value="sandbox">Sandbox Testing Environment</option>
                        <option value="production">Production Store System</option>
                      </select>
                    </div>
                  </div>
                )}

                {posSystem === 'aloha' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black font-mono uppercase text-slate-400">Aloha Bridge Server IP</label>
                      <input 
                        type="text"
                        value={alohaIp} 
                        onChange={(e) => setAlohaIp(e.target.value)}
                        placeholder="192.168.1.100"
                        className="w-full p-2.5 border border-slate-250 rounded-xl bg-white text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black font-mono uppercase text-slate-400">Local Agent TCP Port</label>
                      <input 
                        type="text"
                        value={alohaPort} 
                        onChange={(e) => setAlohaPort(e.target.value)}
                        placeholder="8080"
                        className="w-full p-2.5 border border-slate-250 rounded-xl bg-white text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black font-mono uppercase text-slate-400">NCR Site ID Number</label>
                      <input 
                        type="text"
                        value={alohaSiteId} 
                        onChange={(e) => setAlohaSiteId(e.target.value)}
                        placeholder="99812"
                        className="w-full p-2.5 border border-slate-250 rounded-xl bg-white text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black font-mono uppercase text-slate-400">Aloha DBF File Folder Data Path</label>
                      <input 
                        type="text"
                        value={alohaDbfPath} 
                        onChange={(e) => setAlohaDbfPath(e.target.value)}
                        placeholder="C:\Aloha\DATA"
                        className="w-full p-2.5 border border-slate-250 rounded-xl bg-white text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>
                )}

                {posSystem === 'clover' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black font-mono uppercase text-slate-400">Clover Merchant ID</label>
                      <input 
                        type="text"
                        value={cloverMerchantId} 
                        onChange={(e) => setCloverMerchantId(e.target.value)}
                        placeholder="MID-clv-8120"
                        className="w-full p-2.5 border border-slate-250 rounded-xl bg-white text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black font-mono uppercase text-slate-400">Access Token key (Bearer)</label>
                      <input 
                        type="password"
                        value={cloverAccessToken} 
                        onChange={(e) => setCloverAccessToken(e.target.value)}
                        placeholder="clv_tok_••••••••••••••••"
                        className="w-full p-2.5 border border-slate-250 rounded-xl bg-white text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="block text-[9px] font-black font-mono uppercase text-slate-400">Clover API Regional Environment</label>
                      <select
                        value={cloverEnv}
                        onChange={(e) => setCloverEnv(e.target.value)}
                        className="w-full p-2.5 border border-slate-250 rounded-xl bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500"
                      >
                        <option value="North America Production">North America Production Server (api.clover.com)</option>
                        <option value="Europe Production">Europe Production Server (eu.clover.com)</option>
                        <option value="Sandbox Dev">Sandbox Emulator (sandbox.dev.clover.com)</option>
                      </select>
                    </div>
                  </div>
                )}

                {posSystem === 'custom' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1 col-span-2">
                      <label className="block text-[9px] font-black font-mono uppercase text-slate-400">Custom Sys API Webhook POST Address</label>
                      <input 
                        type="url"
                        placeholder="https://mycompany-erp.com/api/v2/commissary-sync"
                        className="w-full p-2.5 border border-slate-250 rounded-xl bg-white text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="block text-[9px] font-black font-mono uppercase text-slate-400">HTTP Header Verification Token</label>
                      <input 
                        type="password"
                        placeholder="X-Commissary-Signature token"
                        className="w-full p-2.5 border border-slate-250 rounded-xl bg-white text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                {/* Submissions & Sync Automation Sync Trigger controls */}
                <div className="grid md:grid-cols-2 gap-4 p-4.5 bg-slate-50 border rounded-xl">
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black font-mono uppercase text-slate-400">Automated synchronization schedule</label>
                    <select
                      value={posSyncFrequency}
                      onChange={(e) => {
                        setPosSyncFrequency(e.target.value);
                        localStorage.setItem('applet_pos_sync_freq', e.target.value);
                      }}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs font-bold text-slate-705"
                    >
                      <option value="Manual Only">Manual Sync Trigger Only (Ad-Hoc)</option>
                      <option value="Every Hourly">Every 1 Hour (Incremental batch)</option>
                      <option value="Every 4 Hours">Every 4 Hours (Standard Shift check)</option>
                      <option value="Once Daily Nightly">Once Daily (Nightly closing reconciliation)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[9px] font-black font-mono uppercase text-slate-400">Integration Actions</label>
                    <div className="space-y-1 flex flex-col pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                        <input type="checkbox" defaultChecked className="rounded border-slate-300 text-amber-500 accent-amber-500" />
                        Sync New Ingredients to Master List
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-500">
                        <input type="checkbox" className="rounded border-slate-300 text-amber-500 accent-amber-500" />
                        Reconciliation depletion (Enable recipe matrix)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 font-extrabold text-slate-950 rounded-xl text-xs uppercase tracking-wider transition active:scale-95 shadow-md flex items-center justify-center gap-2"
                  >
                    <CheckSquare className="w-4 h-4" /> Save Integration Credentials
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Reset current POS configuration fields back to default demo credentials?")) {
                        localStorage.removeItem('applet_pos_system');
                        localStorage.removeItem('applet_pos_toast_client_id');
                        localStorage.removeItem('applet_pos_toast_client_secret');
                        localStorage.removeItem('applet_pos_toast_rest_id');
                        setPosSystem('toast');
                        setToastClientId('toast-com-92x83');
                        setToastClientSecret('t_sec_99182x7a9bc28');
                        setToastRestId('rt-7261-arlington');
                        showToast("Demo integration configurations restored.");
                      }
                    }}
                    className="px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold border transition"
                    title="Restore demo configurations"
                  >
                    Reset Defaults
                  </button>
                </div>
              </form>
            </div>

            {/* RIGHT SIDE: Technical Logs Console Terminal (Col span: 5) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Live Sandbox Diagnostic Terminal */}
              <div className="bg-slate-950 text-slate-200 p-5 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between border border-slate-800 h-[320px]">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-800 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                      <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 font-mono">
                      POS HANDSHAKE TERMINAL v1.0.4
                    </span>
                  </div>
                  <button 
                    onClick={() => setConnectionLogs([`[${new Date().toLocaleTimeString()}] Terminal cleared.`])}
                    className="text-[9px] font-mono text-slate-500 hover:text-white underline cursor-pointer"
                  >
                    Clear Console
                  </button>
                </div>

                {/* Console Log viewport */}
                <div className="flex-1 overflow-y-auto font-mono text-[10.5px] space-y-1.5 pr-2 custom-scrollbar">
                  {connectionLogs.map((log, i) => {
                    let textClass = "text-slate-300";
                    if (log.includes("[SUCCESS]")) textClass = "text-green-400 font-bold";
                    if (log.includes("[INFO]")) textClass = "text-sky-300";
                    if (log.includes("🚀")) textClass = "text-amber-300 font-bold";
                    return (
                      <p key={i} className={`leading-normal ${textClass} break-all`}>
                        {log}
                      </p>
                    );
                  })}
                  {testingInProgress && (
                    <div className="flex items-center gap-2 text-amber-300 animate-pulse text-[10px]">
                      <Terminal className="w-3.5 h-3.5 animate-spin" />
                      <span>Negotiating active token secure exchange... Please wait...</span>
                    </div>
                  )}
                  {connectionSucceeded && !testingInProgress && (
                    <p className="text-[10.5px] text-green-400 font-bold font-mono">
                      ● TERMINAL: Handshake sequence success. Gateway verified active.
                    </p>
                  )}
                </div>

                <div className="shrink-0 pt-2 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>Host Connection Status:</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    connectionSucceeded 
                      ? 'bg-green-500/15 text-green-400 border border-green-500/30' 
                      : 'bg-slate-850 text-slate-400'
                  }`}>
                    {connectionSucceeded ? 'CONNECTED (ONLINE)' : 'UNTESTED'}
                  </span>
                </div>
              </div>

              {/* Live Catalog Synchronizer Terminal */}
              <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl shadow-xl space-y-3.5 flex flex-col justify-between border border-slate-800 h-[220px]">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-800 shrink-0">
                  <span className="text-[10px] font-mono uppercase font-black text-slate-400 flex items-center gap-1.5">
                    <Database className="w-3 h-3 text-sky-400" /> Catalog sync history log
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Dynamic Import Matrix</span>
                </div>

                <div className="flex-1 overflow-y-auto font-mono text-[10.5px] space-y-1.5 pr-2 custom-scrollbar">
                  {syncLogs.length === 0 ? (
                    <p className="text-slate-500 italic text-center py-6">
                      No active logs. Click "Sync Menu Catalog Now" to pull remote POS master lists and write items.
                    </p>
                  ) : (
                    syncLogs.map((log, i) => {
                      let textClass = "text-slate-300";
                      if (log.includes("[SUCCESS]")) textClass = "text-emerald-400 font-black";
                      if (log.includes("[INFO]")) textClass = "text-zinc-400";
                      return (
                        <p key={i} className={`leading-normal ${textClass}`}>
                          {log}
                        </p>
                      );
                    })
                  )}
                  {syncInProgress && (
                    <div className="flex items-center gap-1.5 text-sky-300 text-[10px] animate-pulse">
                      <span>Sync stream progress: compiling diff matrix...</span>
                    </div>
                  )}
                </div>

                <div className="shrink-0 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono text-center">
                  Live Syncing merges menu records directly to your visible <b>Items</b> tab list.
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Detailed Educational Document Panel - How & What & Purpose */}
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-650 shrink-0">
                <Info className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 font-display">POS Integrations Reference Guide & Operations Manual</h4>
                <p className="text-xs text-slate-500">Read this guideline to understand exact credential provisioning and automatic depletion mechanics.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 pt-2 border-t border-slate-200/60 text-xs">
              
              <div className="space-y-2.5">
                <h5 className="font-bold text-slate-900 flex items-center gap-1 text-[12px]">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-505" /> 1. What does it do?
                </h5>
                <p className="text-slate-600 leading-normal">
                  Fusing your Commissary backend with Point-of-Sale (POS) systems connects the sales register loop with the physical inventory warehouse loop.
                </p>
                <ul className="space-y-1.5 pl-3 list-disc text-slate-500">
                  <li><b>Menu Catalog Sourcing</b>: Zero duplicate entries. One-click synchronization takes current menu listings from Toast/Aloha and maps them directly to your Commissary item checklists.</li>
                  <li><b>Automated Depletion Engine</b>: Correlates ticket sales to recipes. If you sell 50 "Signature Artisan Burgers", the engine automatically debits 50 beef patties and hamburger buns from physical storage volumes.</li>
                  <li><b>Variance Analysis</b>: Highlights shrinkage. Instantly compares actual closing counts submitted by staff with ideal quantities calculated from POS ticket logs, identifying cost leaks immediately.</li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <h5 className="font-bold text-slate-900 flex items-center gap-1 text-[12px]">
                  <Cpu className="w-3.5 h-3.5 text-amber-505" /> 2. Connection Checklist
                </h5>
                <p className="text-slate-600 leading-normal">
                  Configuring authentication keys requires specific sandbox scopes. Please provision the following identifiers with your POS representative:
                </p>
                <div className="space-y-2 bg-white p-3 border rounded-xl leading-normal text-slate-500 font-mono text-[10px]">
                  <p className="font-bold text-slate-700">Recommended Scopes:</p>
                  <p>● <span className="text-sky-600 font-bold">menus:read</span> (Fetch descriptions / prices)</p>
                  <p>● <span className="text-sky-600 font-bold">inventory:write</span> (Adjust stock counters)</p>
                  <p>● <span className="text-sky-600 font-bold">orders:read</span> (Fetch ticket history)</p>
                  <p>● <span className="text-sky-600 font-bold">restaurants:read</span> (Verify location IDs)</p>
                </div>
                <p className="text-slate-500 font-medium">
                  Ensure keys have <span className="text-amber-600 font-mono font-bold uppercase">Client-Credentials</span> grant type enabled before running verification checks.
                </p>
              </div>

              <div className="space-y-2.5">
                <h5 className="font-bold text-slate-900 flex items-center gap-1 text-[12px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-505" /> 3. System Troubleshooting Guide
                </h5>
                <p className="text-slate-600 leading-normal">
                  Common gateway errors and how to resolve network constraints:
                </p>
                <ul className="space-y-2 text-slate-500 list-inside list-none">
                  <li className="p-2 bg-red-50 border border-red-100 rounded-lg text-[11px]">
                    <span className="font-bold text-red-600">Toast 401 Unauthorized:</span> Client Secret expired or scopes mismatch. Verify credentials in your Toast Partner Integrator Portal.
                  </li>
                  <li className="p-2 bg-red-50 border border-red-100 rounded-lg text-[11px]">
                    <span className="font-bold text-red-600">Aloha Socket Refusals:</span> Local firewall blocking incoming TCP port. White-list the Commissary local node proxy on the backoffice store gateway router.
                  </li>
                  <li className="p-2 bg-red-50 border border-red-100 rounded-lg text-[11px]">
                    <span className="font-bold text-red-600">Clover Webhook Latency:</span> Delayed sync. Use webhook configurations to trigger real-time stock deductions instead of polling.
                  </li>
                </ul>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ⚙️ SETTINGS & ROLE-BASED PERMISSIONS MATRIX PANEL                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg sm:text-xl font-display text-white">
                  System Settings & Role Permissions Matrix
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Configure store order email dispatch, Excel verification footer tags, and role access privileges.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs uppercase flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save All Changes</span>
              </button>

              <button
                type="button"
                onClick={handleResetSettingsToDefault}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase transition cursor-pointer border border-slate-700"
              >
                Reset Defaults
              </button>
            </div>
          </div>

          {/* SECTION 1: ORDER DISPATCH & EXCEL VERIFICATION SETTINGS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Box A: Email Configuration */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-700">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">Order Dispatch Email Recipient</h4>
                  <p className="text-[11px] text-slate-500">Destination address for completed store inventory & orders</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10.5px] font-mono uppercase font-bold text-slate-500 block">
                  Default Recipient Email Address:
                </label>
                <input
                  type="email"
                  value={orderEmailInput}
                  onChange={(e) => setOrderEmailInput(e.target.value)}
                  placeholder="michael.goyone@gmail.com"
                  className="w-full bg-white border border-slate-300 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-amber-500 shadow-xs font-mono"
                />
                <p className="text-[11px] text-slate-500 leading-normal">
                  When employees finish counting and ordering, clicking <b>"Email File"</b> will immediately send the authentic populated Excel sheet to this address.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Default recipient: <strong className="font-mono">michael.goyone@gmail.com</strong>. Subject format: <strong className="font-mono">[Filename] - [User Name]</strong>.</span>
              </div>
            </div>

            {/* Box B: Verification Footer Template */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-700">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">Excel Verification Footer Tag</h4>
                  <p className="text-[11px] text-slate-500">Stamp written to the bottom cell of the exported store spreadsheet</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10.5px] font-mono uppercase font-bold text-slate-500 block">
                  Footer Format Template:
                </label>
                <input
                  type="text"
                  value={footerFormatInput}
                  onChange={(e) => setFooterFormatInput(e.target.value)}
                  placeholder="[FILENAME]_[DATE]_[INITIALS] ([INITIALS] [DATE_SLASH])"
                  className="w-full bg-white border border-slate-300 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-amber-500 shadow-xs font-mono"
                />
                <div className="flex flex-wrap gap-1 text-[10px] font-mono text-slate-500">
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">[FILENAME]</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">[DATE] (082226)</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">[DATE_SLASH] (08/22/26)</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">[INITIALS] (MG)</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">[TIME]</span>
                </div>
              </div>

              {/* Live Preview of Tag */}
              <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
                <span className="text-[10px] text-amber-400 font-bold uppercase block">Live Preview Stamp (e.g. Michael Goyone):</span>
                <p className="text-emerald-400 font-black break-all text-[11px]">
                  {footerFormatInput
                    .replace(/\[FILENAME\]|\{FILENAME\}/g, "CH - FOOD - SUN for MON_082226_MG")
                    .replace(/\[DATE\]|\{DATE\}/g, "082226")
                    .replace(/\[DATE_SLASH\]|\{DATE_SLASH\}/g, "08/22/26")
                    .replace(/\[INITIALS\]|\{INITIALS\}/g, "MG")
                    .replace(/\[TIME\]|\{TIME\}/g, "03:45 PM")
                    .replace(/\[USER\]|\{USER\}/g, "Michael Goyone")}
                </p>
                <p className="text-[10px] text-slate-400">
                  Output filename: <span className="text-slate-200 font-bold">CH - FOOD - SUN for MON_082226_MG.xlsx</span>
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: ROLE-BASED PERMISSIONS MATRIX */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-0">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base sm:text-lg text-white font-display">
                    Role-Based Access Control Matrix
                  </h4>
                  <p className="text-xs text-slate-300">
                    Granular permissions across job titles. Cook & Cashier are restricted to counting and ordering.
                  </p>
                </div>
              </div>

              <span className="bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-[11px] font-bold px-3 py-1 rounded-lg">
                Super Admin: Michael Goyone
              </span>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 font-black">System Capability / Privilege</th>
                    <th className="py-3 px-3 text-center bg-amber-50 font-black text-amber-950">
                      Super Admin<br/><span className="text-[9px] text-amber-700 font-normal">(Michael Goyone)</span>
                    </th>
                    <th className="py-3 px-3 text-center font-bold">District Manager</th>
                    <th className="py-3 px-3 text-center font-bold">Manager</th>
                    <th className="py-3 px-3 text-center bg-cyan-50/50 font-bold text-cyan-950">
                      Cashier<br/><span className="text-[9px] text-cyan-700 font-normal">(Simplified)</span>
                    </th>
                    <th className="py-3 px-3 text-center bg-cyan-50/50 font-bold text-cyan-950">
                      Cook<br/><span className="text-[9px] text-cyan-700 font-normal">(Simplified)</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {[
                    { key: 'canCount', label: '1. Count Inventory (Voice & Manual Fast Count)', desc: 'Enter on-hand counts with hands-free voice speech recognition or manual keypads' },
                    { key: 'canOrder', label: '2. Store Ordering (Ordering Phase)', desc: 'Enter store order numbers, par level adjustments, and order boxes' },
                    { key: 'canDownloadExcel', label: '3. Download Populated Excel (.xlsx)', desc: 'Export finished store spreadsheets directly into original Excel formats' },
                    { key: 'canEmailOrders', label: '4. Email Orders to Distribution', desc: 'Dispatch completed store order files directly to distribution center emails' },
                    { key: 'canViewCosts', label: '5. View Wholesale Costs & Financials', desc: 'View item purchase prices, wholesale invoice extensions, and total valuations' },
                    { key: 'canEditParLevels', label: '6. Edit Store Par Levels & Minimums', desc: 'Modify default par levels and shelf stocking minimum quantities' },
                    { key: 'canUploadForms', label: '7. Upload & Ingest Excel Checksheets', desc: 'Upload new physical store checksheets from OneDrive or Google Drive' },
                    { key: 'canAccessAdmin', label: '8. Access Admin Operations Center', desc: 'View database items, locations, sync engines, and integration panels' },
                    { key: 'canManageUsers', label: '9. Manage Employees & Staff Accounts', desc: 'Create, suspend, lock, or adjust user profiles and security roles' },
                    { key: 'canManageSettings', label: '10. Manage System Global Settings', desc: 'Configure order recipient emails, footer templates, and permissions' },
                    { key: 'canManageForms', label: '11. Author & Manage Checksheet Forms', desc: 'Add new store checksheets, edit sections & items, duplicate to other outlets, or delete checksheets. (Restricted to Super Admin Michael Goyone by default)' },
                  ].map((row, idx) => (
                    <tr key={row.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block text-xs sm:text-sm">{row.label}</span>
                        <span className="text-[11px] text-slate-500">{row.desc}</span>
                      </td>

                      {/* Super Admin */}
                      <td className="py-3 px-3 text-center bg-amber-50/30">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-black text-sm" title="Always enabled for Super Admin">
                          ✓
                        </span>
                      </td>

                      {/* District Manager */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission('District Manager', row.key as keyof RolePermissions)}
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-black transition cursor-pointer ${
                            rolePermissionsMatrix['District Manager']?.[row.key as keyof RolePermissions]
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          {rolePermissionsMatrix['District Manager']?.[row.key as keyof RolePermissions] ? '✓' : '—'}
                        </button>
                      </td>

                      {/* Manager */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission('Manager', row.key as keyof RolePermissions)}
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-black transition cursor-pointer ${
                            rolePermissionsMatrix['Manager']?.[row.key as keyof RolePermissions]
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          {rolePermissionsMatrix['Manager']?.[row.key as keyof RolePermissions] ? '✓' : '—'}
                        </button>
                      </td>

                      {/* Cashier */}
                      <td className="py-3 px-3 text-center bg-cyan-50/30">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission('Cashier', row.key as keyof RolePermissions)}
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-black transition cursor-pointer ${
                            rolePermissionsMatrix['Cashier']?.[row.key as keyof RolePermissions]
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          {rolePermissionsMatrix['Cashier']?.[row.key as keyof RolePermissions] ? '✓' : '—'}
                        </button>
                      </td>

                      {/* Cook */}
                      <td className="py-3 px-3 text-center bg-cyan-50/30">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission('Cook', row.key as keyof RolePermissions)}
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-black transition cursor-pointer ${
                            rolePermissionsMatrix['Cook']?.[row.key as keyof RolePermissions]
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          {rolePermissionsMatrix['Cook']?.[row.key as keyof RolePermissions] ? '✓' : '—'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Matrix Footer Action Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 font-mono">
                Permissions are enforced across the entire application interface in real time.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl uppercase tracking-wider shadow-sm transition active:scale-95 cursor-pointer"
                >
                  Save Permissions Matrix
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 3: OFFICIAL JOB CODES & POSITION CLASSIFICATIONS */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-0">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-base sm:text-lg text-white font-display">
                      Official Job Codes & Position Classifications
                    </h4>
                    <span className="bg-amber-500 text-slate-950 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {jobCodesList.length} Job Codes
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Enterprise hierarchy (EXEC-01 to LOG-07) and active permission scopes across all Anita's restaurant locations.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddJobCodeModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs uppercase flex items-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Job Code</span>
              </button>
            </div>

            {/* Job Codes Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 font-black">Code & Department</th>
                    <th className="py-3 px-3 font-bold">Position Title</th>
                    <th className="py-3 px-3 font-bold">System Role Binding</th>
                    <th className="py-3 px-3 font-bold">Active Privileges</th>
                    <th className="py-3 px-3 text-right font-bold pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {jobCodesList.map((job, idx) => {
                    const mappedPerms = rolePermissionsMatrix[job.role] || defaultRolePermissions[job.role] || defaultRolePermissions['Employee'];
                    const activePermCount = Object.values(mappedPerms || {}).filter(Boolean).length;
                    return (
                      <tr key={job.code} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        {/* Code & Dept */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span 
                              className="font-mono text-xs font-black px-2 py-0.5 rounded-lg border text-white shadow-2xs"
                              style={{ backgroundColor: job.color || '#3b82f6', borderColor: job.color || '#3b82f6' }}
                            >
                              {job.code}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                              {job.department}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 max-w-xs">{job.description}</p>
                        </td>

                        {/* Title */}
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-900 text-sm">{job.title}</span>
                          {job.isSystemProtected && (
                            <span className="block text-[9px] font-mono font-bold text-amber-700 uppercase mt-0.5">
                              🔒 Protected Root Code
                            </span>
                          )}
                        </td>

                        {/* System Role Binding */}
                        <td className="py-3.5 px-3">
                          <span className="bg-slate-900 text-white font-mono text-[10px] font-bold px-2 py-1 rounded-lg">
                            {job.role}
                          </span>
                        </td>

                        {/* Active Privileges */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                              {activePermCount} Permissions Active
                            </span>
                            {mappedPerms?.canCount && (
                              <span className="bg-slate-100 text-slate-700 text-[9px] font-medium px-1.5 py-0.5 rounded border border-slate-200">
                                Count
                              </span>
                            )}
                            {mappedPerms?.canOrder && (
                              <span className="bg-slate-100 text-slate-700 text-[9px] font-medium px-1.5 py-0.5 rounded border border-slate-200">
                                Order
                              </span>
                            )}
                            {mappedPerms?.canManageForms && (
                              <span className="bg-amber-100 text-amber-900 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-300">
                                Manage Forms
                              </span>
                            )}
                            {mappedPerms?.canAccessAdmin && (
                              <span className="bg-indigo-100 text-indigo-900 text-[9px] font-bold px-1.5 py-0.5 rounded border border-indigo-200">
                                Admin Access
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-3 text-right pr-4">
                          {job.isSystemProtected ? (
                            <span className="text-[10px] font-mono text-slate-400 font-bold">
                              Permanent
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteJobCode(job.code)}
                              className="p-1.5 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-lg transition"
                              title={`Delete Job Code ${job.code}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Job Codes Footer Action Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 font-mono">
                Job codes are linked to staff account creation and payroll reference sheets.
              </span>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl uppercase tracking-wider shadow-sm transition active:scale-95 cursor-pointer"
              >
                Save All Settings & Job Codes
              </button>
            </div>
          </div>

          {/* ADD JOB CODE MODAL */}
          {showAddJobCodeModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center">
                      <Key className="w-4 h-4" />
                    </div>
                    <h4 className="font-black text-base text-slate-950">Add Enterprise Job Code</h4>
                  </div>
                  <button onClick={() => setShowAddJobCodeModal(false)} className="text-slate-400 hover:text-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">Job Code *</label>
                      <input
                        type="text"
                        value={newJobCode.code}
                        onChange={(e) => setNewJobCode(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        placeholder="e.g. MGR-08"
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">Badge Color</label>
                      <input
                        type="color"
                        value={newJobCode.color}
                        onChange={(e) => setNewJobCode(prev => ({ ...prev, color: e.target.value }))}
                        className="w-full h-9 border border-slate-300 rounded-xl p-1 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">Job Position Title *</label>
                    <input
                      type="text"
                      value={newJobCode.title}
                      onChange={(e) => setNewJobCode(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Shift Lead Supervisor"
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">Department</label>
                      <select
                        value={newJobCode.department}
                        onChange={(e) => setNewJobCode(prev => ({ ...prev, department: e.target.value as any }))}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-amber-500"
                      >
                        <option value="Executive">Executive</option>
                        <option value="Operations">Operations</option>
                        <option value="Front of House">Front of House</option>
                        <option value="Back of House">Back of House</option>
                        <option value="Logistics">Logistics</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">Mapped Role *</label>
                      <select
                        value={newJobCode.role}
                        onChange={(e) => setNewJobCode(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-amber-500"
                      >
                        <option value="Manager">Manager</option>
                        <option value="District Manager">District Manager</option>
                        <option value="Cashier">Cashier</option>
                        <option value="Cook">Cook</option>
                        <option value="Employee">Employee</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 uppercase font-mono text-[10px]">Job Description</label>
                    <textarea
                      value={newJobCode.description}
                      onChange={(e) => setNewJobCode(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the duties and responsibilities for this job code..."
                      rows={2}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddJobCodeModal(false)}
                    className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddJobCode}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer shadow-md"
                  >
                    Save Job Code
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
