import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be signed in to submit a review." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { booking_id, rating, comment, occasion } = body;

    if (!booking_id || !rating || !comment) {
      return NextResponse.json(
        { error: "Booking ID, rating (1-5), and review text are required." },
        { status: 400 }
      );
    }

    const numericRating = Number(rating);
    if (numericRating < 1 || numericRating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    }

    // Verify booking exists, is completed, and belongs to this user
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*, profiles!bookings_client_id_fkey(full_name)")
      .eq("id", booking_id)
      .single();

    if (bErr || !booking) {
      return NextResponse.json({ error: "Booking record not found." }, { status: 404 });
    }

    if (booking.client_id !== user.id && booking.client_email !== user.email) {
      return NextResponse.json(
        { error: "You can only review bookings made with your account." },
        { status: 403 }
      );
    }

    if (booking.status !== "completed") {
      return NextResponse.json(
        { error: "Reviews can only be submitted after the dining service has been marked completed." },
        { status: 400 }
      );
    }

    // Check for duplicate review
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("booking_id", booking_id)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: "A review has already been submitted for this dining experience." },
        { status: 400 }
      );
    }

    // Insert verified review
    const { data: review, error: rErr } = await supabase
      .from("reviews")
      .insert([
        {
          booking_id: booking.id,
          chef_id: booking.chef_id,
          client_id: user.id,
          client_name: user.user_metadata?.full_name || booking.client_name || "Verified Client",
          rating: numericRating,
          comment: comment.trim(),
          occasion: occasion || "Private Dinner",
        },
      ])
      .select()
      .single();

    if (rErr || !review) {
      console.error("[reviews/submit] Insert error:", rErr);
      return NextResponse.json({ error: "Failed to save review." }, { status: 500 });
    }

    // Recalculate chef aggregate rating
    const { data: allReviews } = await supabase
      .from("reviews")
      .select("rating")
      .eq("chef_id", booking.chef_id);

    if (allReviews && allReviews.length > 0) {
      const avg =
        allReviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / allReviews.length;
      await supabase
        .from("chefs")
        .update({
          rating: Math.round(avg * 100) / 100,
          reviews_count: allReviews.length,
        })
        .eq("id", booking.chef_id);
    }

    return NextResponse.json({
      success: true,
      message: "Thank you! Your verified review has been published.",
      review,
    });
  } catch (err: any) {
    console.error("[reviews/submit] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
