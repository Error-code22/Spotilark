'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className='flex items-center justify-center min-h-screen p-4'>
      <div className='max-w-2xl w-full bg-white dark:bg-gray-800 shadow-md rounded-lg p-6'>
        <h1 className='text-3xl font-bold mb-4'>Terms and Conditions</h1>
        <p className='mb-4'>
          Welcome to Spotilark! These terms and conditions outline the rules and regulations for the use of Spotilark's Website, located at [Your Website URL].
        </p>
        <p className='mb-4'>
          By accessing this website we assume you accept these terms and conditions. Do not continue to use Spotilark if you do not agree to take all of the terms and conditions stated on this page.
        </p>
        <h2 className='text-2xl font-semibold mb-3'>License</h2>
        <p className='mb-4'>
          Unless otherwise stated, Spotilark and/or its licensors own the intellectual property rights for all material on Spotilark. All intellectual property rights are reserved. You may access this from Spotilark for your own personal use subjected to restrictions set in these terms and conditions.
        </p>
        <h2 className='text-2xl font-semibold mb-3'>You must not:</h2>
        <ul className='list-disc list-inside mb-4'>
          <li>Republish material from Spotilark</li>
          <li>Sell, rent or sub-license material from Spotilark</li>
          <li>Reproduce, duplicate or copy material from Spotilark</li>
          <li>Redistribute content from Spotilark</li>
        </ul>
        <p className='mb-4'>This Agreement shall begin on the date hereof.</p>
        <p className='mb-4'>
          Parts of this website offer an opportunity for users to post and exchange opinions and information in certain areas of the website. Spotilark does not filter, edit, publish or review Comments prior to their presence on the website. Comments do not reflect the views and opinions of Spotilark,its agents and/or affiliates. Comments reflect the views and opinions of the person who post their views and opinions. To the extent permitted by applicable laws, Spotilark shall not be liable for the Comments or for any liability, damages or expenses caused and/or suffered as a result of any use of and/or posting of and/or appearance of the Comments on this website.
        </p>
        <p className='mb-4'>
          Spotilark reserves the right to monitor all Comments and to remove any Comments which can be considered inappropriate, offensive or causes breach of these Terms and Conditions.
        </p>
        <h2 className='text-2xl font-semibold mb-3'>Your Privacy</h2>
        <p className='mb-4'>Please read our <Link href='/privacy-policy' className='underline text-primary'>Privacy Policy</Link>.</p>
        <h2 className='text-2xl font-semibold mb-3'>Reservation of Rights</h2>
        <p className='mb-4'>
          We reserve the right to request that you remove all links or any particular link to our Website. You approve to immediately remove all links to our Website upon request. We also reserve the right to amen these terms and conditions and it's linking policy at any time. By continuously linking to our Website, you agree to be bound to and follow these linking terms and conditions.
        </p>
        <div className='mt-6 text-center'>
          <Link href='/signup' className='text-blue-500 hover:underline'>
            Back to Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
