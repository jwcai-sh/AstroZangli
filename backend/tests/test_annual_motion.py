from unittest import TestCase
from unittest.mock import patch

from annual_motion import render_annual_motion_html


class AnnualMotionLayoutTests(TestCase):
    @patch("annual_motion.pio.to_html", side_effect=lambda figure, **_kwargs: figure)
    @patch("annual_motion.plot_body_annual_track")
    @patch("annual_motion.draw_scene")
    def test_single_solar_track_does_not_reserve_a_legend_column(
        self, _draw_scene, _plot_track, to_html
    ):
        render_annual_motion_html(latitude=31.23, longitude=121.47, year=2026)

        figure = to_html.call_args.args[0]
        self.assertFalse(figure.layout.showlegend)
