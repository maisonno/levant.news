import { NextResponse } from 'next/server'

const LAT = 43.02
const LON = 6.47

// Mis en cache par Next.js — revalidé toutes les 15 min
export const revalidate = 900

export async function GET() {
  try {
    const [marineRes, windRes] = await Promise.all([
      fetch(
        `https://marine-api.open-meteo.com/v1/marine` +
        `?latitude=${LAT}&longitude=${LON}` +
        `&current=wave_height,wave_direction,wave_period` +
        `,swell_wave_height,swell_wave_direction,swell_wave_period` +
        `,wind_wave_height,wind_wave_direction,wind_wave_period` +
        `&hourly=wave_height,wave_direction,wave_period,swell_wave_height` +
        `&forecast_days=4&timezone=Europe%2FParis`,
        { next: { revalidate: 900 } }
      ),
      fetch(
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${LAT}&longitude=${LON}` +
        `&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m` +
        `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
        `&forecast_days=4&wind_speed_unit=kn&timezone=Europe%2FParis`,
        { next: { revalidate: 900 } }
      ),
    ])

    if (!marineRes.ok || !windRes.ok) {
      return NextResponse.json({ error: 'API error' }, { status: 502 })
    }

    const [marine, wind] = await Promise.all([marineRes.json(), windRes.json()])

    return NextResponse.json(
      { marine, wind, fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } }
    )
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
  }
}
