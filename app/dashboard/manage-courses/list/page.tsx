'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Sesuaikan path jika perlu
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, BookOpen, Loader, AlertTriangle } from 'lucide-react';
import RoleGuard from '@/components/RoleGuard'; // Pastikan path ini benar

// --- DEFINISI TIPE DATA ---

interface Course {
    id: string;
    title: string;
    description: string;
    kelas: string;
    created_at: string;
}

// --- KOMPONEN UTAMA ---
export default function ManageCoursesListPage() {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    // Mengambil daftar kursus
    useEffect(() => {
        const fetchCourses = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    throw new Error("Pengguna tidak ditemukan. Silakan login kembali.");
                }

                const { data, error: courseError } = await supabase
                    .from('courses')
                    .select('id, title, description, kelas, created_at')
                    .eq('created_by', user.id)
                    .order('created_at', { ascending: false });

                if (courseError) {
                    throw courseError;
                }
                setCourses(data || []);
            } catch (err: any) {
                console.error("Error fetching courses:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    // Fungsi untuk menghapus kursus
    const handleDeleteCourse = async (courseId: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus kursus ini secara permanen? Tindakan ini tidak dapat dibatalkan.')) {
            try {
                // Karena ada 'ON DELETE CASCADE' di database,
                // menghapus kursus akan otomatis menghapus semua tahapannya.
                const { error: deleteError } = await supabase
                    .from('courses')
                    .delete()
                    .eq('id', courseId);
                
                if (deleteError) {
                    throw deleteError;
                }

                // Hapus kursus dari state untuk memperbarui UI secara langsung
                setCourses(prevCourses => prevCourses.filter(course => course.id !== courseId));
                alert('Kursus berhasil dihapus.');

            } catch (err: any) {
                console.error("Error deleting course:", err);
                alert(`Gagal menghapus kursus: ${err.message}`);
            }
        }
    };

    // --- TAMPILAN / JSX ---

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center p-10">
                    <Loader className="animate-spin mr-2" />
                    <span>Memuat daftar kursus...</span>
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center" role="alert">
                    <AlertTriangle className="inline-block mr-2" />
                    <strong>Terjadi Kesalahan:</strong>
                    <span className="block sm:inline ml-2">{error}</span>
                </div>
            );
        }

        if (courses.length === 0) {
            return (
                <div className="text-center py-16 px-6 border-2 border-dashed rounded-lg">
                    <BookOpen size={48} className="mx-auto text-gray-400" />
                    <h3 className="mt-2 text-xl font-semibold">Belum Ada Kursus</h3>
                    <p className="mt-1 text-gray-500">Anda belum membuat kursus apapun. Mulai buat sekarang!</p>
                    <Link href="/dashboard/manage-courses/create" className="btn btn-primary mt-6 inline-flex items-center gap-2">
                        <Plus size={18} />
                        Buat Kursus Baru
                    </Link>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {courses.map(course => (
                    <div key={course.id} className="card flex flex-col md:flex-row items-start md:items-center justify-between p-4 gap-4">
                        <div className="flex-grow">
                            <span className="px-2 py-1 bg-sky-100 text-sky-800 text-xs font-semibold rounded-full">{course.kelas}</span>
                            <h3 className="text-lg font-bold mt-2">{course.title}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2">{course.description}</p>
                            <p className="text-xs text-gray-400 mt-2">Dibuat pada: {new Date(course.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <div className="flex-shrink-0 flex gap-2 w-full md:w-auto">
                            <Link href={`/dashboard/manage-courses/edit/${course.id}`} className="btn btn-secondary flex-1 flex items-center justify-center gap-2">
                                <Edit size={16} />
                                <span className="hidden sm:inline">Edit</span>
                            </Link>
                            <button onClick={() => handleDeleteCourse(course.id)} className="btn btn-danger flex-1 flex items-center justify-center gap-2">
                                <Trash2 size={16} />
                                <span className="hidden sm:inline">Hapus</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <RoleGuard allowedRoles={['guru']}>
            <div className="p-4 md:p-8 max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Kelola Kursus</h1>
                        <p className="text-gray-500 mt-1">Buat, edit, atau hapus kursus yang telah Anda buat.</p>
                    </div>
                    {courses.length > 0 && (
                         <Link href="/dashboard/manage-courses/create" className="btn btn-primary inline-flex items-center gap-2 w-full md:w-auto">
                            <Plus size={18} />
                            Buat Kursus Baru
                        </Link>
                    )}
                </div>
                {renderContent()}
            </div>
        </RoleGuard>
    );
}
