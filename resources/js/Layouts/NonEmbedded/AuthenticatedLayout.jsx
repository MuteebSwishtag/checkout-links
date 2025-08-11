import { Toaster } from 'react-hot-toast';

export default function AuthenticatedLayout({ children }) {

    return (
        <div className="min-h-screen bg-gray-100">
            <Toaster
                position="top-right"
                reverseOrder={false}
                toastOptions={{
                    duration: 3000,
                }}
                // Limit to one toast at a time
                limit={1}
            />
            <main>{children}</main>
        </div>
    );
}
