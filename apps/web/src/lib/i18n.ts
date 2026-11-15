import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      // Auth
      "auth.login": "Login",
      "auth.signup": "Sign up",
      "auth.email": "Email address",
      "auth.password": "Password",
      "auth.fullName": "Full name",
      "auth.phone": "Phone number",
      "auth.role": "Role",
      "auth.loginButton": "Login",
      "auth.signupButton": "Create account",
      "auth.noAccount": "Don't have an account?",
      "auth.hasAccount": "Already have an account?",
      "auth.selectRole": "Select your role",
      "auth.logout": "Logout",

      // Roles
      "role.leader": "SHG Leader",
      "role.member": "SHG Member",
      "role.approver": "Approver / Treasurer",
      "role.checker": "Quality Checker",
      "role.buyer": "Buyer",
      "role.federation_staff": "Federation Staff",

      // SHG
      "shg.name": "SHG name",
      "shg.members": "Members",
      "shg.addMember": "Add member",
      "shg.memberName": "Member name",
      "shg.dailyCapacity": "Daily capacity (pieces)",
      "shg.weeklyCapacity": "Weekly capacity (pieces)",
      "shg.availability": "Availability",
      "shg.skills": "Skills",
      "shg.proficiency": "Proficiency",

      // Availability
      "availability.available": "Available",
      "availability.partially_available": "Partially available",
      "availability.unavailable": "Unavailable",

      // Skills
      "skill.CUTTING": "Cutting",
      "skill.STITCHING": "Stitching",
      "skill.TAILORING": "Tailoring",
      "skill.EMBROIDERY": "Embroidery",
      "skill.PACKING": "Packing",
      "skill.QUALITY_CHECK": "Quality check",
      "skill.DELIVERY": "Delivery",
      "skill.ACCOUNTING": "Accounting",
      "skill.OTHER": "Other",

      // Navigation
      "nav.dashboard": "Dashboard",
      "nav.orders": "Orders",
      "nav.members": "Members",
      "nav.quality": "Quality",
      "nav.costing": "Costing",
      "nav.payouts": "Payouts",
      "nav.reports": "Reports",
      "nav.settings": "Settings",
      "nav.myTask": "My Task",
      "nav.myOrders": "My Orders",
      "nav.myEarnings": "My Earnings",
      "nav.profile": "Profile",

      // Common
      "common.save": "Save",
      "common.cancel": "Cancel",
      "common.edit": "Edit",
      "common.delete": "Delete",
      "common.loading": "Loading...",
      "common.error": "Something went wrong",
      "common.noData": "No data yet",
      "common.back": "Back",
      "common.confirm": "Confirm",
      "common.search": "Search",
      "common.filter": "Filter",
    },
  },
  kn: {
    translation: {
      // Kannada translations (placeholder — to be completed)
      "auth.login": "ಲಾಗಿನ್",
      "auth.signup": "ನೋಂದಣಿ",
      "nav.dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
      "nav.members": "ಸದಸ್ಯರು",
      "common.save": "ಉಳಿಸಿ",
      "common.cancel": "ರದ್ದುಮಾಡಿ",
      "common.loading": "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
    },
  },
  hi: {
    translation: {
      // Hindi translations (placeholder — to be completed)
      "auth.login": "लॉगिन",
      "auth.signup": "साइन अप",
      "nav.dashboard": "डैशबोर्ड",
      "nav.members": "सदस्य",
      "common.save": "सहेजें",
      "common.cancel": "रद्द करें",
      "common.loading": "लोड हो रहा है...",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
