import React from "react";

const PlaylistSection = ({ title, songs, onPlay }) => {
  return (
    <div className="spotify-playlist">
      <h2>{title}</h2>
      <div className="card">
        {songs.map((song, index) => (
          <div className="item" key={index} onClick={() => onPlay(song)} style={{ cursor: "pointer" }}>
            <img src={song.img} alt={song.title} />
            <div className="play-btn"><i className="fa-solid fa-play"></i></div>
            <h4>{song.title}</h4>
            <p>{song.artist}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlaylistSection;
