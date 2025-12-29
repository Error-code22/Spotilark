import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        // 1. Security Check (Optional but recommended)
        // To prevent everyone from hitting this, you can check for a secret header
        // if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
        //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        // }

        const supabase = await createClient();

        // 2. Perform a simple query to count as activity
        // Selecting 1 from user_profiles is very lightweight
        const { data, error } = await supabase
            .from("user_profiles")
            .select("id")
            .limit(1);

        if (error) {
            console.error("Keep-Alive Query Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            status: "success",
            message: "Supabase project is awake!",
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error("Keep-Alive Unexpected Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
