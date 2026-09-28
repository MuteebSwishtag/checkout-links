import { Head } from '@inertiajs/react';
import { Page } from '@shopify/polaris';

const features = [
    'Shareable checkout links',
    'Pre-built carts with products and variants',
    'Custom discounts',
    'Customizable checkout popups',
    'Brand colors and custom CSS',
    'Shopify product syncing',
];

export default function Plans() {
    return (
        <Page title="Plans">
            <Head title="Plans" />
            <div className="mb-8 rounded-3xl border border-gray-200 bg-white px-4 py-8 sm:p-10">
                <section aria-labelledby="plan-name" className="mx-auto w-full max-w-sm rounded-2xl bg-[#303030] px-6 py-8 text-white shadow-xl sm:px-8">
                    <h2 id="plan-name" className="text-center text-sm font-semibold uppercase tracking-widest">Basic Plan</h2>
                    <p className="mt-8 text-center text-6xl font-semibold tracking-tight">$4.99</p>
                    <p className="mt-5 text-center text-sm font-medium uppercase tracking-wide">Every 30 days</p>
                    <p className="mt-2 text-center text-xs text-gray-300">Recurring billing · No trial period</p>

                    <ul aria-label="Included features" className="my-10 space-y-3 text-sm text-gray-100">
                        {features.map((feature) => (
                            <li key={feature} className="flex items-start gap-3">
                                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5 shrink-0 text-gray-300">
                                    <path d="m4 10 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {feature}
                            </li>
                        ))}
                    </ul>

                    <button type="button" disabled className="w-full cursor-not-allowed rounded-full bg-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-500">
                        Subscribed
                    </button>
                </section>
            </div>
        </Page>
    );
}
