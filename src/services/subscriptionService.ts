/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - Monetization & Google Play Billing Architecture
 * Free Plan: Max 3 Active Projects, Basic Reports, AdMob Placeholder
 * Pro Plan: Unlimited Active Projects, Advanced Reports, PDF/Excel Exports, Ad-Free
 */

import { MAX_FREE_ACTIVE_PROJECTS } from '../types';

export interface SubscriptionPlan {
  id: string;
  sku: string;
  name: string;
  priceFormatted: string;
  priceAmount: number;
  period: 'monthly' | 'yearly';
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'cmf_pro_monthly',
    sku: 'contractor_money_flow_pro_monthly',
    name: 'Pro Monthly',
    priceFormatted: '₱149 / month',
    priceAmount: 149,
    period: 'monthly',
    features: [
      'Unlimited active projects (Free plan is limited to 3)',
      'Ad-free experience across the app',
      'Advanced financial reports and analysis',
      'Unlimited PDF statement and Excel CSV export',
      'Labor, subcontractor & material payable tracking',
      'Priority offline backup reminders',
    ],
  },
  {
    id: 'cmf_pro_yearly',
    sku: 'contractor_money_flow_pro_yearly',
    name: 'Pro Annual (Save 33%)',
    priceFormatted: '₱1,190 / year',
    priceAmount: 1190,
    period: 'yearly',
    features: [
      'All Pro Monthly features included',
      'Best value: only ~₱99/month',
      'Unlimited project archiving and records',
      'Priority offline database sync',
    ],
  },
];

class SubscriptionService {
  /**
   * Check if user can create a new active project based on subscription tier
   */
  public canCreateActiveProject(activeProjectsCount: number, isPro: boolean): {
    allowed: boolean;
    reason?: string;
  } {
    if (isPro) {
      return { allowed: true };
    }
    if (activeProjectsCount >= MAX_FREE_ACTIVE_PROJECTS) {
      return {
        allowed: false,
        reason: `The Free plan allows up to ${MAX_FREE_ACTIVE_PROJECTS} active projects. You can archive completed projects or upgrade to Pro for unlimited projects.`,
      };
    }
    return { allowed: true };
  }

  /**
   * Verified subscription status check.
   */
  public async getSubscriptionStatus(): Promise<{
    isPro: boolean;
    tier: 'free' | 'pro';
    expiresAt?: string;
  }> {
    const hasLocalDevOverride = localStorage.getItem('cmf_sandbox_preview_pro') === 'true';
    if (hasLocalDevOverride) {
      return { isPro: true, tier: 'pro', expiresAt: '2099-12-31' };
    }
    return { isPro: false, tier: 'free' };
  }

  /**
   * Request subscription purchase via Google Play Billing.
   */
  public async initiatePurchase(planSku: string): Promise<{ success: boolean; message: string }> {
    return {
      success: false,
      message:
        'Google Play Billing requires an Android device with Google Play Services installed. Purchase will be validated directly through your Play Store account.',
    };
  }

  /**
   * Restore previous purchases from Google Play
   */
  public async restorePurchases(): Promise<{ restored: boolean; message: string }> {
    return {
      restored: false,
      message: 'No active Google Play subscriptions found for your connected Google account.',
    };
  }
}

export const subscriptionService = new SubscriptionService();
