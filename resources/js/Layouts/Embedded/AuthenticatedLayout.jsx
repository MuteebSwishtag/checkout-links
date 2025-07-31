import toast, { Toaster } from 'react-hot-toast';

export default function AuthenticatedLayout({ children }) {

    return (
        <div className="min-h-screen bg-gray-100">
            <Toaster
                position="bottom-center"
                reverseOrder={false}
            />
            <main>{children}</main>
        </div>
    );
}
